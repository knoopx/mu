/**
 * The one place in mu that names the change-tracking CLI.
 *
 * A tool asks for a revision, files, hunks and a message and never for a
 * flag: every command here is a fixed template, so a call can reach nothing
 * outside what the tool exposes. Each reader answers in the status vocabulary
 * the tools report (ok, failed, unsupported, empty-selected, empty, none,
 * binary) rather than in an exit code, and the ids it hands back are the ones
 * the repo resolved, never the ones the caller typed.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { findWorkspaceRoot, vcs, vcsHunk } from "./repo";
import type {
  ConflictRow,
  HistoryRow,
  HunkRow,
  LogRow,
  OplogRow,
  RevisionIds,
  RevisionIdentity,
  SplitOutcome,
} from "../types";

/** One sentence, repeated by all ten tools: it carries the fix, because the model reads it too. */
export const NOT_A_JJ_REPO =
  "not a jj repo — run `jj git init` to initialize the jj repo (jj is git-compatible)";

const IDS_TEMPLATE = 'commit_id.short() ++ "\\t" ++ change_id.short()';
const IDENTITY_TEMPLATE =
  'commit_id.short() ++ "\\t" ++ change_id.short() ++ "\\t" ++ description.first_line()';

/** A repo is a directory with a `.jj` above the working copy; null here is what makes every tool answer `unsupported`. */
export function jjRoot(): string | null {
  const root = findWorkspaceRoot();
  return existsSync(join(root, ".jj")) ? root : null;
}

const pair = (line: string): RevisionIds => {
  const parts = line.trim().split("\t");
  return { git: parts[0] ?? "", change: parts[1] ?? "" };
};

const identity = (line: string): RevisionIdentity => {
  const parts = line.trim().split("\t");
  return {
    git: parts[0] ?? "",
    change: parts[1] ?? "",
    description: (parts[2] ?? "").trim(),
  };
};

async function template(rev: string, template: string): Promise<string> {
  if (rev.trim().length === 0) return "";
  const res = await vcs([
    "log",
    "-r",
    rev,
    "--no-graph",
    "--color",
    "never",
    "-T",
    template,
  ]);
  if (res.code !== 0) return "";
  return res.stdout.split("\n")[0] ?? "";
}

/** A revset read back as the pair of ids the log shows — a caller reports what the repo resolved. */
export async function resolveIds(rev: string): Promise<RevisionIds> {
  return pair(await template(rev, IDS_TEMPLATE));
}

/** The same pair with the first line of the description, which is how a write proves the message that landed. */
export async function resolveIdentity(rev: string): Promise<RevisionIdentity> {
  return identity(await template(rev, IDENTITY_TEMPLATE));
}

export interface WriteOutcome {
  error: string;
}

/** The description lands; the caller re-resolves the revision, because rewriting the working copy mints a new change id. */
export async function runDescribe(
  rev: string,
  message: string,
): Promise<WriteOutcome> {
  const res = await vcs(["describe", "-r", rev, "-m", message]);
  return {
    error: res.code === 0 ? "" : cliFailure("jj describe", res),
  };
}

/** The named files are the selected half; both ids come back in the CLI's own split report. */
export async function runFileSplit(
  rev: string,
  files: readonly string[],
  message: string,
): Promise<SplitOutcome> {
  const res = await vcs(["split", "-r", rev, ...files, "-m", message]);
  if (res.code !== 0)
    return {
      status: "failed",
      selected: { git: "", change: "" },
      remaining: { git: "", change: "" },
      error: cliFailure("jj split", res),
    };
  return readSplitOutput(res.stdout, res.stderr, "jj split");
}

/** The jj-hunk CLI drives this one, on ids from a fresh listing — which is where `empty-selected` comes from. */
export async function runHunkSplit(
  rev: string,
  spec: string,
  message: string,
): Promise<SplitOutcome> {
  const res = await vcsHunk(["split", "-r", rev, spec, message]);
  if (res.code !== 0)
    return {
      status: "failed",
      selected: { git: "", change: "" },
      remaining: { git: "", change: "" },
      error: cliFailure("jj-hunk split", res),
    };
  return readSplitOutput(res.stdout, res.stderr, "jj-hunk split");
}

/** Only the remainder moves, and only when the caller named a place for it. */
export async function rebaseAfter(
  change: string,
  insertAfter: string,
): Promise<string> {
  const res = await vcs([
    "rebase",
    "-r",
    change,
    "--insert-after",
    insertAfter,
  ]);
  return res.code === 0 ? "" : cliFailure("jj rebase", res);
}

/** A listing with no rows is `empty`, not a failure: the revision is there, the selection matched nothing. */
export interface HunkListOutcome {
  status: "ok" | "empty" | "failed";
  rows: HunkRow[];
  error: string;
}

/** Read from the CLI's JSON rather than its text, so a hunk id survives a change to the human output. */
export async function runHunkList(
  rev: string,
  files?: string,
): Promise<HunkListOutcome> {
  const globs = (files ?? "")
    .split(",")
    .map((glob) => glob.trim())
    .filter((glob) => glob.length > 0);
  const args = ["list", "-r", rev, "--format", "json"];
  for (const glob of globs) args.push("-i", glob);
  const res = await vcsHunk(args);
  if (res.code !== 0)
    return {
      status: "failed",
      rows: [],
      error: cliFailure("jj-hunk list", res),
    };

  let parsed: unknown;
  try {
    parsed = JSON.parse(res.stdout);
  } catch {
    return {
      status: "failed",
      rows: [],
      error: "invalid JSON from jj-hunk list",
    };
  }

  const filesOut = (parsed as { files?: unknown }).files;
  const rows: HunkRow[] = [];
  for (const file of Array.isArray(filesOut) ? filesOut : []) {
    const record = file as { path?: unknown; hunks?: unknown };
    const path = typeof record.path === "string" ? record.path : "";
    const hunks = Array.isArray(record.hunks) ? record.hunks : [];
    for (const hunk of hunks) {
      const h = hunk as {
        id?: unknown;
        type?: unknown;
        before?: { start?: unknown; lines?: unknown };
        after?: { start?: unknown; lines?: unknown };
      };
      rows.push({
        file: path,
        hunk: typeof h.id === "string" ? h.id : "",
        type: typeof h.type === "string" ? h.type : "",
        before: range(h.before),
        after: range(h.after),
      });
    }
  }
  return {
    status: rows.length === 0 ? "empty" : "ok",
    rows,
    error: "",
  };
}

/** `file=hunk-id` as the model writes it; an entry missing either half is dropped rather than guessed at. */
export function hunkEntries(
  hunks: readonly string[],
): Array<{ file: string; hunk: string }> {
  return hunks
    .map((entry) => {
      const at = entry.indexOf("=");
      return at < 0
        ? { file: "", hunk: "" }
        : {
            file: entry.slice(0, at).trim(),
            hunk: entry.slice(at + 1).trim(),
          };
    })
    .filter((entry) => entry.file.length > 0 && entry.hunk.length > 0);
}

/** Regrouped per file into the one spec the CLI takes, `default: reset` so an unlisted hunk stays put. */
export function hunkSpec(
  entries: readonly { file: string; hunk: string }[],
): string {
  const files: Record<string, { ids: string[] }> = {};
  for (const entry of entries)
    (files[entry.file] ??= { ids: [] }).ids.push(entry.hunk);
  return JSON.stringify({ files, default: "reset" });
}

function range(part: { start?: unknown; lines?: unknown } | undefined): string {
  const start = typeof part?.start === "number" ? part.start : 0;
  const lines = typeof part?.lines === "number" ? part.lines : 0;
  return `${String(start)}-${String(lines)}`;
}

function cliError(res: { stdout: string; stderr: string }): string {
  const stderr = res.stderr.trim();
  return stderr.length > 0 ? stderr : res.stdout.trim();
}

/** One sentence for a failed call: the command the tool asked for, the exit it gave, the reason it gave. */
function cliFailure(
  command: string,
  res: { code: number; stdout: string; stderr: string },
): string {
  return `${command} failed (exit ${String(res.code)}): ${cliError(res)}`;
}

const SPLIT_LINE = /^(Selected|Remaining) changes ?\s*:\s*/;

/**
 * Both halves are read out of the split's own report. A selection that matched
 * nothing is answered as `empty-selected` with both ids, so an empty commit is
 * named as the problem instead of reported as a clean split.
 */
function readSplitOutput(
  stdout: string,
  stderr: string,
  label: string,
): SplitOutcome {
  const lines = `${stdout}\n${stderr}`.split("\n");
  const selected = { git: "", change: "" };
  const remaining = { git: "", change: "" };
  let warned = false;
  for (const line of lines) {
    const text = line.trim();
    const match = SPLIT_LINE.exec(text);
    if (match !== null) {
      const words = text
        .slice(match[0]!.length)
        .split(/\s+/)
        .filter((w) => w.length > 0);
      const target = match[1] === "Selected" ? selected : remaining;
      target.change = words[0] ?? "";
      target.git = words[1] ?? "";
    }
    if (text.includes("No changes have been selected")) warned = true;
  }

  if (selected.change.length === 0 || remaining.change.length === 0)
    return {
      status: "failed",
      selected,
      remaining,
      error: `could not parse the selected/remaining change identities from ${label} output`,
    };

  if (warned)
    return {
      status: "empty-selected",
      selected,
      remaining,
      error:
        "empty selection: the named files or hunk ids match nothing in this revision, so the selected commit is empty — verify them against the revision's changes",
    };

  return { status: "ok", selected, remaining, error: "" };
}

const rowsFrom = (text: string): string[] =>
  text
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const cells = (line: string): string[] => line.split("\t");

/** A jj log window, read as the fields its own template promised. */
function logRows<R>(
  stdout: string,
  offset: number,
  row: (fields: string[]) => R,
): R[] {
  return rowsFrom(stdout)
    .slice(offset)
    .map((line) => row(cells(line)));
}

/** The CLI reads paths from the repo root; the UI holds absolute ones. */
export function relativeToRoot(path: string): string {
  const root = findWorkspaceRoot();
  const prefix = `${root}/`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}

const LOG_FIELDS =
  'change_id.short() ++ "\\t" ++ commit_id.short() ++ "\\t" ++ author.email() ++ "\\t" ++ ' +
  'format_timestamp(author.timestamp()) ++ "\\t" ++ description.first_line()';

const LOG_COMPACT = `${LOG_FIELDS} ++ "\\n"`;
const LOG_FULL =
  `${LOG_FIELDS} ++ "\\t" ++ bookmarks.join(", ") ++ "\\t" ++ tags.join(", ") ++ "\\t" ++ ` +
  'diff.files().map(|f| f.path()).join(", ") ++ "\\n"';

export interface LogQuery {
  rev?: string;
  bookmark?: string;
  limit?: number;
  offset?: number;
  oldestFirst?: boolean;
  full?: boolean;
}

export interface LogOutcome {
  status: "ok" | "empty" | "failed";
  revset: string;
  rows: LogRow[];
  error: string;
}

/** Revset and bookmark intersect into one scope; the columns are a template, so `full` changes the template instead of adding a flag. */
export async function runLog(query: LogQuery): Promise<LogOutcome> {
  const revset = [
    (query.rev ?? "").trim(),
    (query.bookmark ?? "").trim().length > 0
      ? `bookmarks(${query.bookmark!.trim()})`
      : "",
  ]
    .filter((part) => part.length > 0)
    .join(" & ");

  const limit = query.limit ?? 25;
  const offset = query.offset ?? 0;
  const args = [
    "log",
    "--no-graph",
    "-n",
    String(limit + offset),
    "-T",
    query.full === true ? LOG_FULL : LOG_COMPACT,
  ];
  if (revset.length > 0) args.push("-r", revset);
  if (query.oldestFirst === true) args.push("--reversed");

  const res = await vcs(args);
  if (res.code !== 0)
    return {
      status: "failed",
      revset,
      rows: [],
      error: cliFailure("jj log", res),
    };

  const rows = logRows(res.stdout, offset, (f) => ({
    change: f[0] ?? "",
    commit: f[1] ?? "",
    author: f[2] ?? "",
    date: f[3] ?? "",
    description: f[4] ?? "",
    bookmarks: f[5] ?? "",
    tags: f[6] ?? "",
    files: f[7] ?? "",
  }));
  return {
    status: rows.length === 0 ? "empty" : "ok",
    revset,
    rows,
    error: "",
  };
}

const HISTORY_TEMPLATE =
  'concat(commit_id.short(), "\\t", change_id.short(), "\\t", author.email(), "\\t", ' +
  'format_timestamp(author.timestamp()), "\\t", description.first_line(), "\\n")';

export interface HistoryOutcome {
  status: "ok" | "empty" | "failed";
  rows: HistoryRow[];
  error: string;
}

export async function runFileHistory(
  path: string,
  limit = 20,
  offset = 0,
): Promise<HistoryOutcome> {
  const rel = relativeToRoot(path);
  const looksLikeId =
    /^[0-9a-f]{7,64}$/.test(path) || /^[0-9a-z]{7,}$/.test(path);
  const revset = looksLikeId ? path : `files(root:"${rel}")`;

  const res = await vcs([
    "log",
    "--no-graph",
    "-n",
    String(limit + offset),
    "-r",
    revset,
    "-T",
    HISTORY_TEMPLATE,
  ]);
  if (res.code !== 0)
    return {
      status: "failed",
      rows: [],
      error: cliFailure("jj log", res),
    };

  const rows = logRows(res.stdout, offset, (f) => ({
    hash: f[0] ?? "",
    change: f[1] ?? "",
    author: f[2] ?? "",
    date: f[3] ?? "",
    subject: f[4] ?? "",
  }));
  return {
    status: rows.length === 0 ? "empty" : "ok",
    rows,
    error: "",
  };
}

function filterDiff(body: string, path: string): string {
  if (path.length === 0 || path === "*") return body;
  const sections: string[] = [];
  let current: string[] = [];
  for (const line of body.split("\n")) {
    if (line.startsWith("diff --git ")) {
      if (current.length > 0) sections.push(current.join("\n"));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) sections.push(current.join("\n"));
  return sections
    .filter((section) => (section.split("\n")[0] ?? "").includes(path))
    .join("\n");
}

export interface DiffOutcome {
  status: "ok" | "empty" | "failed";
  body: string;
  lines: number;
  error: string;
}

/** The parent as a change id — the second end of a diff when the caller named only one end. */
export async function parentRev(from: string): Promise<string> {
  const res = await vcs([
    "log",
    "-r",
    `${from}-`,
    "-T",
    "change_id.short()",
    "--no-graph",
    "--color",
    "never",
  ]);
  if (res.code !== 0) return "";
  return (rowsFrom(res.stdout)[0] ?? "").trim();
}

/** Always the whole tree from the CLI, cut to the named path here, because there is no per-path form to ask for. */
export async function runDiff(
  path: string,
  from: string,
  to: string,
): Promise<DiffOutcome> {
  const args =
    to.length === 0
      ? ["diff", "--git", "-r", from]
      : ["diff", "--git", "--from", from, "--to", to];
  const res = await vcs(args);
  if (res.code !== 0)
    return {
      status: "failed",
      body: "",
      lines: 0,
      error: cliFailure("jj diff", res),
    };

  const body = filterDiff(res.stdout, relativeToRoot(path));
  const count = body.length === 0 ? 0 : body.split("\n").length;
  return {
    status: count === 0 ? "empty" : "ok",
    body,
    lines: count,
    error: "",
  };
}

const isBinary = (text: string): boolean =>
  text.includes("\u0000") ||
  /[\u0001-\u0008\u000B\u000C\u000E-\u001F]/.test(text);

export interface ShowOutcome {
  status: "ok" | "empty" | "binary" | "failed";
  body: string;
  lines: number;
  error: string;
}

/** The fallback runs only when the CLI says the subcommand is unknown, never on an ordinary failure. */
export async function runFileShow(
  path: string,
  hash: string,
): Promise<ShowOutcome> {
  const rel = relativeToRoot(path);
  const res = await vcs(["file", "show", "--revision", hash, "--", rel]);
  const unsupported =
    res.code !== 0 &&
    (res.stderr.includes("unknown subcommand") ||
      res.stderr.includes("unknown argument") ||
      res.stdout.includes("unknown subcommand") ||
      res.stdout.includes("unknown argument"));

  if (res.code === 0) return showBody(res.stdout);

  if (!unsupported)
    return {
      status: "failed",
      body: "",
      lines: 0,
      error: cliFailure("jj file show", res),
    };

  const fallback = await vcs([
    "show",
    "-r",
    hash,
    "--format",
    "markdown",
    "--",
    rel,
  ]);
  if (fallback.code !== 0)
    return {
      status: "failed",
      body: "",
      lines: 0,
      error: `jj lacks \`file show\` support and the fallback failed (exit ${String(fallback.code)}): ${cliError(fallback)}`,
    };
  return showBody(fallback.stdout);
}

function showBody(body: string): ShowOutcome {
  if (isBinary(body))
    return { status: "binary", body: "", lines: 0, error: "" };
  const lines = body.length === 0 ? 0 : body.split("\n").length;
  return {
    status: lines === 0 ? "empty" : "ok",
    body,
    lines,
    error: "",
  };
}

export interface ConflictsOutcome {
  status: "ok" | "none" | "failed";
  scope: string;
  revisions: number;
  rows: ConflictRow[];
  note: string;
  error: string;
}

/** Conflicted revisions first, then their files: a conflict belongs to one revision, and an empty scope is the working copy the user is standing in. */
export async function runConflicts(rev: string): Promise<ConflictsOutcome> {
  const scope = rev.length > 0 ? `${rev}::conflicts()` : "@ & conflicts()";
  const found = await vcs([
    "log",
    "--no-graph",
    "-T",
    'change_id.short() ++ "\\t" ++ commit_id.short() ++ "\\n"',
    "-r",
    scope,
  ]);
  if (found.code !== 0)
    return {
      status: "failed",
      scope,
      revisions: 0,
      rows: [],
      note: "",
      error: cliFailure("jj log", found),
    };

  const revisions = rowsFrom(found.stdout).map((line) => {
    const f = cells(line);
    return { change: f[0] ?? "", commit: f[1] ?? "" };
  });
  if (revisions.length === 0)
    return {
      status: "none",
      scope,
      revisions: 0,
      rows: [],
      note: "",
      error: "",
    };

  const working = await vcs([
    "log",
    "--no-graph",
    "-T",
    'change_id.short() ++ "\\n"',
    "-r",
    "@",
  ]);
  const wc = rowsFrom(working.stdout)[0] ?? "";

  const rows: ConflictRow[] = [];
  const notes: string[] = [];
  for (const revision of revisions.slice(0, 25)) {
    const listed = await vcs(["resolve", "--list", "-r", revision.change]);
    if (listed.code !== 0) {
      notes.push(`jj resolve --list failed (exit ${String(listed.code)})`);
      continue;
    }
    for (const line of rowsFrom(listed.stdout)) {
      const tokens = line.split(/\s+/).filter((token) => token.length > 0);
      rows.push({
        change: revision.change,
        commit: revision.commit,
        path: tokens[0] ?? "",
        sides: tokens.slice(1).join(" "),
        working_copy: revision.change === wc,
      });
    }
  }

  return {
    status: "ok",
    scope,
    revisions: revisions.length,
    rows,
    note: notes.join("; "),
    error: "",
  };
}

const OPLOG_TEMPLATE =
  'id ++ "\\t" ++ time ++ "\\t" ++ description.trim_end() ++ "\\n"';

export interface OplogOutcome {
  status: "ok" | "empty" | "failed";
  rows: OplogRow[];
  error: string;
}

/** The CLI's own history of state changes; compact is a display budget, and the whole id is one parameter away. */
export async function runOplog(
  limit = 25,
  offset = 0,
  oldestFirst = false,
  full = false,
): Promise<OplogOutcome> {
  const args = [
    "op",
    "log",
    "--no-graph",
    "-n",
    String(limit + offset),
    "-T",
    OPLOG_TEMPLATE,
  ];
  if (oldestFirst) args.push("--reversed");

  const res = await vcs(args);
  if (res.code !== 0)
    return {
      status: "failed",
      rows: [],
      error: cliFailure("jj op log", res),
    };

  const rows = rowsFrom(res.stdout)
    .slice(offset)
    .map((line) => {
      const f = cells(line);
      const op = f[0] ?? "";
      const description = f.slice(2).join("\t");
      return {
        op: full ? op : truncate(op, 12),
        time: f[1] ?? "",
        description: full ? description : truncate(description, 120),
      };
    });
  return {
    status: rows.length === 0 ? "empty" : "ok",
    rows,
    error: "",
  };
}

const truncate = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max)}…` : text;

/**
 * The whole patch one operation introduced, in git format and flush left.
 *
 * `jj operation diff` wraps its patch in a report and indents the patch under
 * it, so the indent is taken back off here: the diff rows adwaita parses key off
 * a `diff --git` that starts a line, and one operation is a diff of the whole
 * repo, which is why it is read in one piece and cut up per file by
 * `opPatchFiles` rather than one call per file.
 */
export interface OpPatchOutcome {
  status: "ok" | "empty" | "failed";
  patch: string;
  error: string;
}

const OP_DIFF_HEAD = /^\s+diff --git /;

/** The first and last line of the indented patch block, or neither. */
function patchSpan(lines: readonly string[]): [number, number] | null {
  const first = lines.findIndex((line) => OP_DIFF_HEAD.test(line));
  if (first < 0) return null;
  let last = first;
  for (let i = lines.length - 1; i > first; i--) {
    if ((lines[i] ?? "").startsWith(" ")) {
      last = i;
      break;
    }
  }
  return [first, last];
}

export async function runOpPatch(op: string): Promise<OpPatchOutcome> {
  const wanted = op.trim();
  if (wanted.length === 0) return { status: "empty", patch: "", error: "" };

  const res = await vcs([
    "operation",
    "diff",
    "--op",
    wanted,
    "--git",
    "--color",
    "never",
  ]);
  if (res.code !== 0)
    return {
      status: "failed",
      patch: "",
      error: cliFailure("jj op diff", res),
    };

  const lines = res.stdout.split("\n");
  const span = patchSpan(lines);
  if (span === null) return { status: "empty", patch: "", error: "" };

  const [first, last] = span;
  const head = lines[first] ?? "";
  const indent = head.length - head.trimStart().length;
  const strip = (line: string): string =>
    indent > 0 && line.startsWith(" ".repeat(indent))
      ? line.slice(indent)
      : line;
  const patch = lines
    .slice(first, last + 1)
    .map(strip)
    .join("\n");

  return {
    status: patch.trim().length === 0 ? "empty" : "ok",
    patch,
    error: "",
  };
}
