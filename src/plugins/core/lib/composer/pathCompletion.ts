import { readdirSync, statSync, type Dirent } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fuzzyFilter } from "../../../../fuzzy";
import type { ComposerPanelRow } from "../../components/composer/Composer";
import { iconForFile } from "../files/fileIcons";

/**
 * Path completion: the draft's trailing token becomes a directory listing.
 *
 * A token completes when it reads like a path — `~`, `~/x`, `/x`, `./x`, `../x`,
 * `@x`, or anything with a `/` in it — so Tab stays inert in prose. Listing is a
 * shell's: prefix matches, directories first, hidden names only once you type a
 * dot. A completed directory keeps its trailing `/`, which is how the panel knows
 * to stay open and keep completing inside it.
 */

const MAX_COMPLETIONS = 200;

const URL_LIKE = /^[a-z][a-z0-9+.-]*:\/\//i;

export interface PathToken {
  /** The text being completed, e.g. `~/src/pl`. */
  token: string;
  /** Where the token starts in the draft. */
  start: number;
}

export interface PathCompletion {
  /** What the token becomes: `~/src/plugins/`, `@src/plugins/`, `README.md`. */
  value: string;
  /** The name alone, as the row labels it. */
  name: string;
  isDirectory: boolean;
}

export interface CompletionResult {
  /** The draft with the token replaced: the panel's query when completing continues. */
  query: string;
  /** The draft to keep: a completed file is followed by a space, a directory is not. */
  text: string;
  /** True when the completion is a directory, so completion continues inside it. */
  isDirectory: boolean;
}

const isSpace = (char: string): boolean => /\s/.test(char);

function isPathToken(token: string): boolean {
  if (token.length === 0) return false;
  if (URL_LIKE.test(token)) return false;
  const bare = token.startsWith("@") ? token.slice(1) : token;
  if (bare.length === 0) return false;
  if (bare.startsWith("~")) return true;
  if (bare.startsWith("/")) return true;
  if (bare === "." || bare === "..") return true;
  if (bare.startsWith("./") || bare.startsWith("../")) return true;
  return bare.includes("/");
}

/** The path-like token a draft ends with: its trailing run of non-space characters. */
export function pathTokenOf(text: string): PathToken | null {
  let start = text.length;
  while (start > 0 && !isSpace(text[start - 1])) start--;
  const token = text.slice(start);
  return isPathToken(token) ? { token, start } : null;
}

const isDirectoryCompletion = (value: string): boolean => value.endsWith("/");

/** The editor can take the same Tab press as an inserted tab; a draft never wants one. */
export const stripTrailingTab = (text: string): string =>
  text.replace(/\t+$/, "");

interface Target {
  /** The absolute directory to list. */
  dir: string;
  /** The name filter inside it. */
  prefix: string;
  /** The text a completion is written after, in the shape it was typed. */
  head: string;
}

const homeOf = (rest: string, home: string): string =>
  rest.length === 0 ? home : resolve(home, rest);

const absoluteOf = (body: string, cwd: string, home: string): string =>
  body === "~"
    ? home
    : body.startsWith("~/")
      ? homeOf(body.slice(2), home)
      : body.startsWith("/")
        ? resolve(body)
        : resolve(cwd, body);

const headOf = (sigil: string, body: string): string => {
  const slash = body.lastIndexOf("/");
  if (slash >= 0) return `${sigil}${body.slice(0, slash + 1)}`;
  if (body === "~") return `${sigil}~/`;
  if (body === ".") return `${sigil}./`;
  if (body === "..") return `${sigil}../`;
  return sigil;
};

function targetOf(token: string, cwd: string, home: string): Target | null {
  const sigil = token.startsWith("@") ? "@" : "";
  const body = token.slice(sigil.length);
  if (body.length === 0) return null;
  const head = headOf(sigil, body);
  if (body === "~") return { dir: home, prefix: "", head };
  if (body === ".") return { dir: resolve(cwd), prefix: "", head };
  if (body === "..") return { dir: resolve(cwd, ".."), prefix: "", head };
  const path = absoluteOf(body, cwd, home);
  return body.endsWith("/")
    ? { dir: path, prefix: "", head }
    : { dir: dirname(path), prefix: basename(path), head };
}

interface Entry {
  name: string;
  isDirectory: boolean;
}

function isDirectoryEntry(dir: string, entry: Dirent): boolean {
  if (entry.isDirectory()) return true;
  if (entry.isSymbolicLink()) {
    try {
      return statSync(join(dir, entry.name)).isDirectory();
    } catch {
      return false;
    }
  }
  return false;
}

const compareEntries = (a: Entry, b: Entry): number =>
  (a.isDirectory === b.isDirectory ? 0 : a.isDirectory ? -1 : 1) ||
  a.name.localeCompare(b.name, undefined, {
    numeric: true,
    sensitivity: "base",
  });

function entriesOf(dir: string): Entry[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.name !== "." && entry.name !== "..")
    .map((entry) => ({
      name: entry.name,
      isDirectory: isDirectoryEntry(dir, entry),
    }))
    .sort(compareEntries);
}

function matchesOf(target: Target): Entry[] {
  const listed = entriesOf(target.dir);
  const visible = target.prefix.startsWith(".")
    ? listed
    : listed.filter((entry) => !entry.name.startsWith("."));
  if (target.prefix.length === 0) return visible;
  const prefix = target.prefix.toLowerCase();
  const starts = visible.filter((entry) =>
    entry.name.toLowerCase().startsWith(prefix),
  );
  return starts.length > 0
    ? starts
    : fuzzyFilter(visible, target.prefix, (entry) => entry.name);
}

export interface CompletionList {
  completions: PathCompletion[];
  total: number;
}

function pathCompletions(
  text: string,
  cwd: string,
  home = homedir(),
): CompletionList {
  const token = pathTokenOf(text);
  if (token === null) return { completions: [], total: 0 };
  const target = targetOf(token.token, cwd, home);
  if (target === null) return { completions: [], total: 0 };
  const matches = matchesOf(target);
  return {
    total: matches.length,
    completions: matches.slice(0, MAX_COMPLETIONS).map((entry) => ({
      value: `${target.head}${entry.name}${entry.isDirectory ? "/" : ""}`,
      name: entry.name,
      isDirectory: entry.isDirectory,
    })),
  };
}

export function pathCompletionRows(
  text: string,
  cwd: string,
  home?: string,
): ComposerPanelRow[] {
  // Every row comes from the same directory, so the row is just the name: the
  // status line under the panel is what says which directory is being listed.
  return pathCompletions(text, cwd, home).completions.map((item) => ({
    kind: "option" as const,
    key: item.value,
    label: item.isDirectory ? `${item.name}/` : item.name,
    icon: item.isDirectory ? "folder" : iconForFile(item.name),
  }));
}

export function pathStatusText(text: string, total: number): string {
  const token = pathTokenOf(text);
  if (token === null) return "Type a path, then press Tab to complete it";
  if (total === 0) return `No path matches ${token.token}`;
  return `${total} ${total === 1 ? "path" : "paths"} match ${token.token}`;
}

/** Write a completion over the token the draft is typing. */
export function applyCompletion(text: string, value: string): CompletionResult {
  const token = pathTokenOf(text);
  const at = token === null ? text.length : token.start;
  const query = `${text.slice(0, at)}${value}`;
  const isDirectory = isDirectoryCompletion(value);
  return { query, text: isDirectory ? query : `${query} `, isDirectory };
}

/** One folder's own summary, for the preview pane while a folder is highlighted. */
export function directorySummary(
  value: string,
  cwd: string,
  home?: string,
): string | undefined {
  if (!isDirectoryCompletion(value)) return undefined;
  const names = entriesOf(completionPathOf(value, cwd, home)).filter(
    (entry) => !entry.name.startsWith("."),
  ).length;
  return `folder · ${names} ${names === 1 ? "name" : "names"}`;
}

/** The absolute path a completion names, for reading a preview of it. */
export function completionPathOf(
  value: string,
  cwd: string,
  home = homedir(),
): string {
  const bare = value.startsWith("@") ? value.slice(1) : value;
  if (bare === "~") return home;
  if (bare.startsWith("~/")) return homeOf(bare.slice(2), home);
  return resolve(cwd, bare);
}
