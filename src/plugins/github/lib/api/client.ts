/**
 * The only file that speaks to GitHub.
 *
 * It knows the host, the version mu asks for, the token in the environment, the
 * timeout a call is given, and the day-long cache that keeps a research session
 * from spending its rate limit rereading the same page. A read asks for a path
 * and gets one `GithubReply`: the parsed answer, or why there is none, in the
 * plugin's own status words rather than an HTTP code the caller has to
 * interpret twice. Nothing above this file builds a URL.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { muCacheDir } from "../../../core/lib/utils/paths";
import {
  API_ROOT,
  API_VERSION,
  CACHE_TTL_MS,
  CLIENT_NAME,
  RAW_ROOT,
  REQUEST_TIMEOUT_MS,
} from "../../constants";
import type { GithubRate } from "../../types";

/** What a request can end as. A reply that is not `ok` carries the reason. */
type ReplyStatus = "ok" | "failed" | "unsupported";

export interface GithubReply {
  status: ReplyStatus;

  /** the HTTP code, 0 when no answer came back at all */
  code: number;

  /** the parsed JSON body — empty for a raw read and for every failure */
  json: unknown;

  /** the body as text: a raw file's content, and nothing else */
  text: string;

  error: string;
  rate: GithubRate;

  /** the answer came out of mu's own cache rather than off the network */
  cached: boolean;
  ms: number;
}

export interface RequestOptions {
  /** abort the request when the tool call is cancelled */
  signal?: AbortSignal;
  /** skip the cache and read live: the `refresh` a call asked for */
  refresh?: boolean;
}

const NO_RATE: GithubRate = { limit: 0, remaining: 0 };

/** The token mu reads a call with, in the order GitHub's own tools look. */
function githubToken(): string {
  for (const key of ["GITHUB_TOKEN", "GH_TOKEN"]) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return "";
}

export const hasToken = (): boolean => githubToken() !== "";

/** What to tell the model when a read needs an account and has none. */
export const TOKEN_HINT =
  "this read needs a signed-in account — set GITHUB_TOKEN (or GH_TOKEN) for mu's process";

/** A path segment may hold spaces and hashes; the rest of the URL stays as written. */
export const encodePath = (path: string): string =>
  path
    .split("/")
    .filter((part) => part !== "")
    .map((part) => encodeURIComponent(part))
    .join("/");

/** The query string of a search, built once so a cache key is the same twice. */
export const queryOf = (params: Record<string, string | number>): string =>
  new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  ).toString();

/** The quota the API reported, which is what turns a 403 into a legible line. */
function rateOf(headers: Headers): GithubRate {
  const number = (name: string): number => {
    const value = headers.get(name);
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return {
    limit: number("x-ratelimit-limit"),
    remaining: number("x-ratelimit-remaining"),
  };
}

/** The part of a URL worth naming in an error, without the host in front of it. */
const scopeOf = (url: string): string =>
  url.startsWith(API_ROOT)
    ? url.slice(API_ROOT.length + 1)
    : url.startsWith(RAW_ROOT)
      ? url.slice(RAW_ROOT.length + 1)
      : url;

const messageOf = (json: unknown): string => {
  if (typeof json !== "object" || json === null) return "";
  const message = (json as Record<string, unknown>)["message"];
  return typeof message === "string" ? message : "";
};

/** What a refusal means, in the words a reader can act on. */
function failureNote(code: number, json: unknown, rate: GithubRate, url: string): string {
  const message = messageOf(json);
  const scope = scopeOf(url);

  if (code === 404)
    return `not found: ${scope} — no such repository, ref, path, number or tag`;
  if (code === 401)
    return `GitHub refused the token in the environment: ${message === "" ? "it is not accepted" : message}`;
  if (code === 403 && rate.remaining <= 0)
    return hasToken()
      ? `GitHub's rate limit for this account is spent (0 of ${String(rate.limit)} reads left, mu's cache is the only fast read for a day)`
      : `GitHub's rate limit for unauthenticated reads is spent — ${TOKEN_HINT}`;
  if (code === 403) return `GitHub refused the call: ${message}`;
  if (code === 422) return `GitHub could not use the request: ${message}`;
  if (code === 451) return `the repository is unavailable for legal reasons where this request was made: ${scope}`;
  if (code === 401 || code === 403) return `GitHub refused the call: ${message}`;
  if (code >= 500) return `GitHub answered ${String(code)} for ${scope} — try again shortly`;
  return message === ""
    ? `GitHub answered ${String(code)} for ${scope}`
    : `GitHub answered ${String(code)} for ${scope}: ${message}`;
}

interface CacheEntry {
  at: number;
  code: number;
  text: string;
  rate: GithubRate;
}

const cacheDir = (): string => join(muCacheDir(), "github");

const cacheFile = (url: string): string =>
  join(cacheDir(), `${createHash("sha256").update(url).digest("hex")}.json`);

async function cachedEntry(url: string): Promise<CacheEntry | null> {
  try {
    const raw = await readFile(cacheFile(url), "utf8");
    const entry = JSON.parse(raw) as CacheEntry;
    if (typeof entry?.at !== "number" || typeof entry?.text !== "string") return null;
    if (Date.now() - entry.at > CACHE_TTL_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

/** A cache write is never the reason a call fails, so its failure is silent. */
async function storeEntry(url: string, entry: CacheEntry): Promise<void> {
  try {
    await mkdir(cacheDir(), { recursive: true });
    await writeFile(cacheFile(url), JSON.stringify(entry), "utf8");
  } catch {}
}

/** The abort signal of one request: the caller's cancellation, and a timeout. */
function requestSignal(signal?: AbortSignal): {
  signal: AbortSignal;
  done: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const aborted = (): void => controller.abort();
  signal?.addEventListener("abort", aborted, { once: true });
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", aborted);
    },
  };
}

const ok = (code: number, body: unknown, text: string, reply: Partial<GithubReply>): GithubReply => ({
  status: "ok",
  code,
  json: body,
  text,
  error: "",
  rate: NO_RATE,
  cached: false,
  ms: 0,
  ...reply,
});

const refused = (
  code: number,
  error: string,
  rate: GithubRate,
  ms: number,
): GithubReply => ({
  status: "failed",
  code,
  json: null,
  text: "",
  error,
  rate,
  cached: false,
  ms,
});

/** A call that never got an answer to read: cancelled, or no route to GitHub. */
function unreachable(error: string, ms: number): GithubReply {
  return { ...ok(0, null, "", { ms }), status: "unsupported", error };
}

/** The headers of one read: JSON or raw text, mu's name, and the token if there is one. */
function headersOf(raw: boolean): Record<string, string> {
  const token = githubToken();
  const headers: Record<string, string> = {
    Accept: raw ? "application/vnd.github.raw" : "application/vnd.github+json",
    "User-Agent": CLIENT_NAME,
    "X-GitHub-Api-Version": API_VERSION,
  };
  if (token !== "") headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/** A cached answer, still inside its day, or null to ask GitHub. */
async function hitOf(url: string, raw: boolean): Promise<GithubReply | null> {
  const hit = await cachedEntry(url);
  if (hit === null) return null;
  return ok(hit.code, raw ? null : parseJson(hit.text), raw ? hit.text : "", {
    rate: hit.rate,
    cached: true,
  });
}

/** One response, read: the body parsed, the quota kept, the answer stored for a day. */
async function settledOf(
  response: Response,
  raw: boolean,
  url: string,
  ms: number,
): Promise<GithubReply> {
  const rate = rateOf(response.headers);
  const text = await response.text();

  if (!response.ok)
    return refused(response.status, failureNote(response.status, parseJson(text), rate, url), rate, ms);

  const json = raw ? null : parseJson(text);
  if (!raw && json === null)
    return refused(
      response.status,
      `GitHub answered something that is not JSON for ${scopeOf(url)}`,
      rate,
      ms,
    );

  void storeEntry(url, { at: Date.now(), code: response.status, text, rate });
  return ok(response.status, json, raw ? text : "", { rate, ms });
}

/**
 * One GET, cached for a day. `raw` reads the file host and answers with text;
 * every other read asks the API for JSON.
 */
async function get(
  url: string,
  raw: boolean,
  options: RequestOptions,
): Promise<GithubReply> {
  const cancelled = (): boolean => options.signal?.aborted === true;

  if (cancelled()) return unreachable("the call was cancelled", 0);

  if (options.refresh !== true) {
    const hit = await hitOf(url, raw);
    if (hit !== null) return hit;
  }

  const { signal, done } = requestSignal(options.signal);
  const started = Date.now();

  try {
    const response = await fetch(url, {
      headers: headersOf(raw),
      signal,
      redirect: "follow",
    });
    return await settledOf(response, raw, url, Date.now() - started);
  } catch (error: unknown) {
    if (cancelled()) return unreachable("the call was cancelled", Date.now() - started);
    const reason = error instanceof Error ? error.message : String(error);
    return unreachable(`GitHub is unreachable: ${reason}`, Date.now() - started);
  } finally {
    done();
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** A REST read: `repos/cli/cli`, `search/issues?q=…`, and the reply it answers with. */
export const apiGet = (path: string, options: RequestOptions = {}): Promise<GithubReply> =>
  get(`${API_ROOT}/${path.replace(/^\//, "")}`, false, options);

/** A raw file read: `owner/repo/ref/path`, answered as text rather than base64. */
export const rawGet = (path: string, options: RequestOptions = {}): Promise<GithubReply> =>
  get(`${RAW_ROOT}/${path.replace(/^\//, "")}`, true, options);


