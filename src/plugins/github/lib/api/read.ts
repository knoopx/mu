/**
 * The nine reads: one GitHub endpoint each, one `GithubCall` in return.
 *
 * A read asks for one path, or two when a file is too big for the contents
 * endpoint and has to come off the raw host. It builds the blank scope first and
 * answers from it whatever happens, so every outcome — a record, a list, a
 * refusal, a folder where a file was asked for — carries the same shape. The
 * fields and rows are GitHub's own words; the caps are the plugin's constants.
 */

import {
  AUTH_ONLY_SEARCH_KINDS,
  DEFAULT_COMMENT_LIMIT,
  DEFAULT_RELEASE_LIMIT,
  DEFAULT_SEARCH_LIMIT,
  MAX_BODY_CHARS,
  MAX_COMMENT_LIMIT,
  MAX_COMMIT_FILES,
  MAX_FILE_CHARS,
  MAX_PR_FILES,
  MAX_RELEASE_LIMIT,
  MAX_SEARCH_LIMIT,
  MAX_TREE_ROWS,
  SEARCH_KINDS,
} from "../../constants";
import { answered, blankCall, bodyOf, fieldList, rankedRows, refused } from "../call";
import type { GithubFound, GithubRowDraft } from "../call";
import type { GithubBlank, GithubCall, GithubField, GithubKind } from "../../types";
import { apiGet, encodePath, hasToken, queryOf, rawGet, TOKEN_HINT } from "./client";
import type { GithubReply, RequestOptions } from "./client";
import {
  countsOf,
  dateOf,
  dateOnlyOf,
  decodeContent,
  flagOf,
  labelsOf,
  listOf,
  licenseOf,
  loginOf,
  looksBinary,
  nested,
  numberOf,
  recordOf,
  shortSha,
  sizeOf,
  stringOf,
  textOf,
} from "./record";

export interface GithubReadInput {
  owner?: string;
  repo?: string;
  ref?: string;
  path?: string;
  number?: number;
  sha?: string;
  tag?: string;
  login?: string;
  query?: string;
  kind?: string;
  limit?: number;
  files?: boolean;
  refresh?: boolean;
  signal?: AbortSignal;
}

/** What a reply says it cost, carried into every answer that reads it. */
const costsOf = (reply: GithubReply) => ({
  cached: reply.cached,
  ms: reply.ms,
  rate: reply.rate,
});

/** The answer a reply that is not `ok` already is, or null to keep reading. */
function refusedBy(reply: GithubReply, blank: GithubBlank): GithubCall | null {
  if (reply.status === "ok") return null;
  return refused(blank, reply.error, reply.status);
}

const optionsOf = (input: GithubReadInput): RequestOptions => ({
  signal: input.signal,
  refresh: input.refresh,
});

/** `repos/owner/repo`, or empty when the call did not name both halves. */
function repoPath(owner = "", repo = ""): string {
  const who = (owner ?? "").trim();
  const what = (repo ?? "").trim();
  if (who === "" || what === "") return "";
  return `repos/${encodeURIComponent(who)}/${encodeURIComponent(what)}`;
}

/** The `?ref=` a ref asks for, and none when the caller left the default branch. */
const refQuery = (ref = ""): string => {
  const wanted = (ref ?? "").trim();
  return wanted === "" ? "" : `?ref=${encodeURIComponent(wanted)}`;
};

/** The ref the raw host wants: whatever was asked for, or the repo's head. */
const rawRef = (ref = ""): string => ((ref ?? "").trim() === "" ? "HEAD" : (ref ?? "").trim());

/** A repo-scoped call that was not given a repo is not a call worth making. */
function needRepo(
  input: GithubReadInput,
  kind: GithubKind,
): { blank: GithubBlank; answer: GithubCall | null } {
  const blank = blankCall(kind, input);
  if (repoPath(input.owner, input.repo) !== "") return { blank, answer: null };
  return { blank, answer: refused(blank, "missing required parameters: owner and repo") };
}

/** `owner/repo` in the words an error names it with. */
const repoLabel = (input: GithubReadInput): string =>
  `${(input.owner ?? "").trim()}/${(input.repo ?? "").trim()}`;

/** A `limit` a call may set, bounded by the plugin's own floor and ceiling. */
function bounded(
  limit: number | undefined,
  fallback: number,
  max: number,
  min = 1,
): number {
  if (limit === undefined || !Number.isFinite(limit)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(limit)));
}

export async function readRepo(input: GithubReadInput): Promise<GithubCall> {
  const { blank, answer } = needRepo(input, "repo");
  if (answer !== null) return answer;

  const reply = await apiGet(repoPath(input.owner, input.repo), optionsOf(input));
  const stop = refusedBy(reply, blank);
  if (stop !== null) return stop;

  const record = recordOf(reply.json);
  const state = flagOf(record["archived"])
    ? "archived"
    : flagOf(record["disabled"])
      ? "disabled"
      : stringOf(record["visibility"], "public");

  return answered(blank, "ok", "", {
    ...costsOf(reply),
    fields: fieldList([
      ["repo", stringOf(record["full_name"])],
      ["description", textOf(record["description"])],
      ["stars", String(numberOf(record["stargazers_count"]))],
      ["forks", String(numberOf(record["forks_count"]))],
      ["language", stringOf(record["language"])],
      ["license", licenseOf(record["license"])],
      ["state", state],
      ["branch", stringOf(record["default_branch"])],
      ["open issues", String(numberOf(record["open_issues_count"]))],
      ["size", sizeOf(numberOf(record["size"]) * 1024)],
      ["pushed", dateOf(record["pushed_at"])],
      ["url", urlOf(record)],
    ]),
  });
}

/** The contents endpoint, which answers for a folder and, given a file path, a file. */
async function contentsOf(
  input: GithubReadInput,
  kind: GithubKind,
): Promise<{ reply: GithubReply; blank: GithubBlank }> {
  const blank = blankCall(kind, input);
  const base = repoPath(input.owner, input.repo);
  const folder = (input.path ?? "").trim();
  const path = `${base}/contents${folder === "" ? "" : `/${encodePath(folder)}`}${refQuery(input.ref)}`;
  return { reply: await apiGet(path, optionsOf(input)), blank };
}

export async function readTree(input: GithubReadInput): Promise<GithubCall> {
  const guard = needRepo(input, "tree");
  if (guard.answer !== null) return guard.answer;

  const { reply, blank } = await contentsOf(input, "tree");
  const stop = refusedBy(reply, blank);
  if (stop !== null) return stop;

  if (!Array.isArray(reply.json))
    return refused(
      blank,
      `${blank.path === "" ? "the repository root" : blank.path} is a file — github-file reads it`,
    );

  const listed = listOf(reply.json).map((item) => {
    const record = recordOf(item);
    const type = stringOf(record["type"], "file");
    return {
      name: stringOf(record["name"]),
      detail: stringOf(record["path"]),
      state: type,
      figure: type === "file" ? sizeOf(record["size"]) : "",
    };
  });
  const { rows, omitted } = rankedRows(listed, MAX_TREE_ROWS);

  return answered(blank, rows.length === 0 ? "empty" : "ok", "", {
    ...costsOf(reply),
    fields: fieldList([
      ["folder", blank.path === "" ? "(root)" : blank.path],
      ["ref", blank.ref === "" ? "(default)" : blank.ref],
      ["entries", String(listed.length)],
    ]),
    rows,
    omitted,
    total: listed.length,
  });
}

/** Where a file is and how big it came out, as the answer says it. */
function fileFields(
  record: Record<string, unknown>,
  wanted: string,
  ref: string,
): GithubField[] {
  return fieldList([
    ["file", stringOf(record["name"], wanted.split("/").pop() ?? wanted)],
    ["path", wanted],
    ["ref", ref === "" ? "(default)" : ref],
    ["size", sizeOf(record["size"])],
    ["sha", shortSha(stringOf(record["sha"]))],
  ]);
}

/**
 * A file's text, and what reading it cost. The contents endpoint carries the
 * text as base64 up to about a megabyte and gives up above that, so a file with
 * a size and no content is read again off the raw host, which holds it as
 * itself.
 */
async function fileTextOf(
  record: Record<string, unknown>,
  reply: GithubReply,
  input: GithubReadInput,
  wanted: string,
): Promise<{ text: string | null; costs: GithubFound }> {
  const text = decodeContent(record["content"]);
  if (text !== null || numberOf(record["size"]) === 0)
    return { text, costs: costsOf(reply) };

  const raw = await rawGet(
    `${(input.owner ?? "").trim()}/${(input.repo ?? "").trim()}/${rawRef(input.ref)}/${encodePath(wanted)}`,
    optionsOf(input),
  );
  if (raw.status !== "ok") return { text: null, costs: costsOf(reply) };

  return {
    text: raw.text,
    costs: {
      cached: reply.cached || raw.cached,
      ms: reply.ms + raw.ms,
      rate: raw.rate,
    },
  };
}

export async function readFile(input: GithubReadInput): Promise<GithubCall> {
  const guard = needRepo(input, "file");
  if (guard.answer !== null) return guard.answer;
  const blank = guard.blank;
  const wanted = (input.path ?? "").trim();
  if (wanted === "") return refused(blank, "missing required parameter: path");

  const reply = await apiGet(
    `${repoPath(input.owner, input.repo)}/contents/${encodePath(wanted)}${refQuery(input.ref)}`,
    optionsOf(input),
  );
  const stop = refusedBy(reply, blank);
  if (stop !== null) return stop;

  if (Array.isArray(reply.json))
    return refused(blank, `${wanted} is a folder — github-tree lists it`);

  const record = recordOf(reply.json);
  const where = fileFields(record, wanted, blank.ref);
  const name = stringOf(record["name"], wanted.split("/").pop() ?? wanted);
  const size = sizeOf(record["size"]);
  const read = await fileTextOf(record, reply, input, wanted);

  if (read.text === null || looksBinary(read.text))
    return answered(
      blank,
      "binary",
      `${name}${size === "" ? "" : ` (${size})`} is not text — mu cannot show its bytes here`,
      { ...read.costs, fields: where },
    );

  const text = read.text;
  const clipped = bodyOf(text, MAX_FILE_CHARS);
  return answered(blank, text.trim() === "" ? "empty" : "ok", "", {
    ...read.costs,
    fields: [...where, ...fieldList([["lines", String(text.split("\n").length)]])],
    body: clipped.body,
    bodyOmitted: clipped.omitted,
  });
}

/**
 * A numbered read. A pull request and an issue are one number in one repository
 * and, at GitHub, one endpoint apiece with the same shape of answer, so the
 * guard, the number, the scope and any answer that is already a refusal settle
 * here; what a tool makes of the record is its own business.
 */
async function numberedOf(
  input: GithubReadInput,
  kind: GithubKind,
): Promise<
  { answer: GithubCall } | { blank: GithubBlank; reply: GithubReply; number: number }
> {
  const guard = needRepo(input, kind);
  if (guard.answer !== null) return { answer: guard.answer };

  const number = Math.max(1, Math.floor(numberOf(input.number)));
  const blank = blankCall(kind, { ...input, target: `#${String(number)}` });
  const endpoint = kind === "pr" ? "pulls" : "issues";
  const reply = await apiGet(
    `${repoPath(input.owner, input.repo)}/${endpoint}/${String(number)}`,
    optionsOf(input),
  );
  const stop = refusedBy(reply, blank);
  if (stop !== null) return { answer: stop };

  return { blank, reply, number };
}

/** What a pull request and an issue both say about themselves. */
function sharedFields(record: Record<string, unknown>): (readonly [string, string])[] {
  return [
    ["title", textOf(record["title"])],
    ["author", loginOf(record["user"])],
    ["created", dateOf(record["created_at"])],
  ];
}

/** The page a human can open, when GitHub gave one. */
const urlOf = (record: Record<string, unknown>): string => stringOf(record["html_url"]);

export async function readPull(input: GithubReadInput): Promise<GithubCall> {
  const read = await numberedOf(input, "pr");
  if ("answer" in read) return read.answer;

  const { blank, reply, number } = read;
  const base = repoPath(input.owner, input.repo);
  const record = recordOf(reply.json);
  const merged = stringOf(record["merged_at"]);
  const state = flagOf(record["draft"])
    ? "draft"
    : merged === ""
      ? stringOf(record["state"], "open").toLowerCase()
      : "merged";

  const fields = fieldList([
    ["pr", `#${String(numberOf(record["number"], number))}`],
    ...sharedFields(record),
    ["state", state],
    ["head", stringOf(nested(record["head"])["label"])],
    ["base", stringOf(nested(record["base"])["label"])],
    ["commits", String(numberOf(record["commits"]))],
    ["changes", countsOf(record["additions"], record["deletions"])],
    ["files", String(numberOf(record["changed_files"]))],
    ["merged", merged === "" ? "" : dateOf(record["merged_at"])],
    ["url", urlOf(record)],
  ]);
  let found = recordFound(reply, record, fields);

  if (input.files === true) {
    const files = await apiGet(
      `${base}/pulls/${String(number)}/files?${queryOf({ per_page: MAX_PR_FILES })}`,
      optionsOf(input),
    );
    if (files.status === "ok")
      found = foldRows(found, files, listOf(files.json).map(fileRow), MAX_PR_FILES);
  }

  return answered(blank, "ok", "", found);
}

/**
 * The record half of an answer: its fields, plus the prose body GitHub keeps
 * beside them (`body` on a pull request, an issue and a release alike), cut to
 * the budget a tool may spend on context.
 */
function recordFound(
  reply: GithubReply,
  record: Record<string, unknown>,
  fields: GithubField[],
): GithubFound {
  const body = bodyOf(stringOf(record["body"]), MAX_BODY_CHARS);
  return { ...costsOf(reply), fields, body: body.body, bodyOmitted: body.omitted };
}

/**
 * A second endpoint's list, folded into an answer already built: the rows, how
 * many the cap left out, and the cost of the extra call added to the first.
 */
function foldRows(
  found: GithubFound,
  reply: GithubReply,
  listed: readonly GithubRowDraft[],
  cap: number,
  total = listed.length,
): GithubFound {
  const ranked = rankedRows(listed, cap);
  return {
    ...found,
    rows: ranked.rows,
    omitted: ranked.omitted,
    total,
    ms: (found.ms ?? 0) + reply.ms,
    cached: found.cached === true || reply.cached,
  };
}

/** One changed file of a commit or a pull request. */
function fileRow(item: unknown) {
  const file = recordOf(item);
  return {
    name: stringOf(file["filename"]),
    detail: stringOf(file["previous_filename"]),
    state: stringOf(file["status"], "modified"),
    figure: countsOf(file["additions"], file["deletions"]),
  };
}

export async function readIssue(input: GithubReadInput): Promise<GithubCall> {
  const read = await numberedOf(input, "issue");
  if ("answer" in read) return read.answer;

  const { blank, reply, number } = read;
  const base = repoPath(input.owner, input.repo);
  const record = recordOf(reply.json);
  if (Object.keys(nested(record["pull_request"])).length > 0)
    return refused(
      blank,
      `#${String(number)} of ${repoLabel(input)} is a pull request — github-pr reads it`,
    );

  const state = [
    stringOf(record["state"], "open").toLowerCase(),
    stringOf(record["state_reason"]),
  ]
    .filter((word) => word !== "")
    .join(" ");

  const fields = fieldList([
    ["issue", `#${String(numberOf(record["number"], number))}`],
    ...sharedFields(record),
    ["state", state],
    ["closed", dateOf(record["closed_at"])],
    ["labels", labelsOf(record["labels"])],
    ["comments", String(numberOf(record["comments"]))],
    ["url", urlOf(record)],
  ]);
  let found = recordFound(reply, record, fields);

  const wanted = bounded(input.limit, DEFAULT_COMMENT_LIMIT, MAX_COMMENT_LIMIT, 0);
  if (wanted > 0 && numberOf(record["comments"]) > 0) {
    const comments = await apiGet(
      `${base}/issues/${String(number)}/comments?${queryOf({ per_page: wanted })}`,
      optionsOf(input),
    );
    if (comments.status === "ok") {
      const listed = listOf(comments.json).map((item) => {
        const comment = recordOf(item);
        return {
          name: loginOf(comment["user"]),
          detail: textOf(comment["body"]),
          state: "",
          figure: dateOf(comment["created_at"]),
        };
      });
      const total = numberOf(record["comments"]);
      found = {
        ...foldRows(found, comments, listed, wanted, total),
        // the rest of the thread was never fetched, which is the same news to a reader
        omitted: Math.max(0, total - listed.length),
      };
    }
  }

  return answered(blank, "ok", "", found);
}

export async function readRelease(input: GithubReadInput): Promise<GithubCall> {
  const guard = needRepo(input, "release");
  if (guard.answer !== null) return guard.answer;

  const base = repoPath(input.owner, input.repo);
  const tag = (input.tag ?? "").trim();
  const blank = blankCall(tag === "" ? "releases" : "release", { ...input, target: tag });

  if (tag === "") {
    const limit = bounded(input.limit, DEFAULT_RELEASE_LIMIT, MAX_RELEASE_LIMIT);
    const reply = await apiGet(
      `${base}/releases?${queryOf({ per_page: limit })}`,
      optionsOf(input),
    );
    const stop = refusedBy(reply, blank);
    if (stop !== null) return stop;

    const listed = listOf(reply.json).map((item) => {
      const record = recordOf(item);
      return {
        name: stringOf(record["name"]) || stringOf(record["tag_name"]),
        detail: stringOf(record["tag_name"]),
        state: flagOf(record["prerelease"])
          ? "prerelease"
          : flagOf(record["draft"])
            ? "draft"
            : "",
        figure: dateOnlyOf(record["published_at"]),
      };
    });
    const { rows, omitted } = rankedRows(listed, limit);

    return answered(blank, rows.length === 0 ? "empty" : "ok", "", {
      ...costsOf(reply),
      fields: fieldList([["releases", String(listed.length)]]),
      rows,
      omitted,
      total: listed.length,
    });
  }

  const reply = await apiGet(
    `${base}/releases/tags/${encodeURIComponent(tag)}`,
    optionsOf(input),
  );
  const stop = refusedBy(reply, blank);
  if (stop !== null) return stop;

  const record = recordOf(reply.json);
  const fields = fieldList([
    ["tag", stringOf(record["tag_name"], tag)],
    ["name", textOf(record["name"])],
    [
      "state",
      flagOf(record["prerelease"])
        ? "prerelease"
        : flagOf(record["draft"])
          ? "draft"
          : "released",
    ],
    ["published", dateOf(record["published_at"])],
    ["author", loginOf(record["author"])],
    ["assets", String(listOf(record["assets"]).length)],
    ["url", urlOf(record)],
  ]);

  return answered(blank, "ok", "", recordFound(reply, record, fields));
}

export async function readCommit(input: GithubReadInput): Promise<GithubCall> {
  const guard = needRepo(input, "commit");
  if (guard.answer !== null) return guard.answer;
  const sha = (input.sha ?? "").trim();
  if (sha === "") return refused(guard.blank, "missing required parameter: sha");

  const reply = await apiGet(
    `${repoPath(input.owner, input.repo)}/commits/${encodeURIComponent(sha)}`,
    optionsOf(input),
  );
  const stop = refusedBy(reply, guard.blank);
  if (stop !== null) return stop;

  const record = recordOf(reply.json);
  const commit = nested(record["commit"]);
  const author = nested(commit["author"]);
  const stats = nested(record["stats"]);
  const full = stringOf(commit["message"]);
  const subject = full.split("\n")[0] ?? "";
  const named = loginOf(record["author"]);
  const message = full.includes("\n") ? bodyOf(full, MAX_BODY_CHARS) : { body: "", omitted: 0 };

  const listed = listOf(record["files"]).map(fileRow);
  const { rows, omitted } = rankedRows(listed, MAX_COMMIT_FILES);

  return answered(guard.blank, "ok", "", {
    ...costsOf(reply),
    fields: fieldList([
      ["commit", shortSha(stringOf(record["sha"], sha))],
      ["description", textOf(subject)],
      [
        "author",
        `${stringOf(author["name"])}${named === "" ? "" : ` (${named})`}`.trim(),
      ],
      ["date", dateOf(author["date"])],
      ["changes", countsOf(stats["additions"], stats["deletions"])],
      ["files", String(listed.length)],
      ["url", urlOf(record)],
    ]),
    rows,
    omitted,
    body: message.body,
    bodyOmitted: message.omitted,
    total: listed.length,
  });
}

/** The search endpoint a kind reads, empty for a kind mu does not offer. */
const searchEndpoint = (kind: string): string =>
  (SEARCH_KINDS as readonly string[]).includes(kind) ? `search/${kind}` : "";

export async function readSearch(input: GithubReadInput): Promise<GithubCall> {
  const query = (input.query ?? "").trim();
  const kind = (input.kind ?? "repositories").trim().toLowerCase();
  const blank = blankCall("search", { ...input, target: kind });
  if (query === "") return refused(blank, "missing required parameter: query");

  const endpoint = searchEndpoint(kind);
  if (endpoint === "")
    return refused(blank, `unknown search kind: ${kind} — mu offers ${SEARCH_KINDS.join(", ")}`);

  // Code and commit search are signed-in reads at GitHub, whatever the repo is.
  if (AUTH_ONLY_SEARCH_KINDS.includes(kind) && !hasToken())
    return refused(blank, `${kind} search needs a signed-in read: ${TOKEN_HINT}`, "unsupported");

  const limit = bounded(input.limit, DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT);
  const reply = await apiGet(
    `${endpoint}?${queryOf({ q: query, per_page: limit })}`,
    optionsOf(input),
  );
  const stop = refusedBy(reply, blank);
  if (stop !== null) return stop;

  const record = recordOf(reply.json);
  const listed = listOf(record["items"]).map((item) => searchRow(kind, recordOf(item)));
  const { rows, omitted } = rankedRows(listed, limit);

  return answered(blank, rows.length === 0 ? "empty" : "ok", "", {
    ...costsOf(reply),
    fields: fieldList([
      ["kind", kind],
      ["total", String(numberOf(record["total_count"]))],
      ["shown", String(rows.length)],
    ]),
    rows,
    omitted,
    total: numberOf(record["total_count"]),
  });
}

/** What one hit of each search kind looks like. */
function searchRow(kind: string, item: Record<string, unknown>) {
  const repo = stringOf(nested(item["repository"])["full_name"]);

  if (kind === "code")
    return { name: stringOf(item["path"]), detail: repo, state: "", figure: "" };

  if (kind === "issues")
    return {
      name: textOf(item["title"], 120),
      detail: repo === "" ? `#${String(numberOf(item["number"]))}` : `${repo}#${String(numberOf(item["number"]))}`,
      state: stringOf(item["state"], "open"),
      figure: `${String(numberOf(item["comments"]))} comments`,
    };

  if (kind === "commits")
    return {
      name: shortSha(stringOf(item["sha"])),
      detail: textOf(nested(item["commit"])["message"], 120),
      state: repo,
      figure: loginOf(nested(item["author"])),
    };

  if (kind === "users")
    return {
      name: stringOf(item["login"]),
      detail: textOf(item["bio"], 120),
      state: stringOf(item["type"]),
      figure: `${String(numberOf(item["public_repos"]))} repos · ${String(numberOf(item["followers"]))} followers`,
    };

  return {
    name: stringOf(item["full_name"]),
    detail: textOf(item["description"]),
    state: stringOf(item["language"]),
    figure: `${String(numberOf(item["stargazers_count"]))} stars`,
  };
}

export async function readUser(input: GithubReadInput): Promise<GithubCall> {
  const login = (input.login ?? "").trim();
  const blank = blankCall("user", { ...input, target: login });
  if (login === "") return refused(blank, "missing required parameter: login");

  const reply = await apiGet(`users/${encodeURIComponent(login)}`, optionsOf(input));
  const stop = refusedBy(reply, blank);
  if (stop !== null) return stop;

  const record = recordOf(reply.json);

  return answered(blank, "ok", "", {
    ...costsOf(reply),
    fields: fieldList([
      ["login", stringOf(record["login"], login)],
      ["name", textOf(record["name"])],
      ["bio", textOf(record["bio"])],
      ["type", stringOf(record["type"])],
      ["company", textOf(record["company"])],
      ["location", textOf(record["location"])],
      ["repos", String(numberOf(record["public_repos"]))],
      ["gists", String(numberOf(record["public_gists"]))],
      ["followers", String(numberOf(record["followers"]))],
      ["following", String(numberOf(record["following"]))],
      ["joined", dateOnlyOf(record["created_at"])],
      ["url", urlOf(record)],
    ]),
  });
}
