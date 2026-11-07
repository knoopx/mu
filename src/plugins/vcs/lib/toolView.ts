/**
 * Turns what a vcs tool answered into what the transcript draws. The ten
 * tools answer two audiences: `content` text in aligned columns for the
 * model, and structured `details` for the log. This file folds the details
 * into one `VcsToolView` so the components never parse a tool's shape, and
 * it names no tool string — every tool is matched by its constant.
 */

import {
  VCS_CONFLICTS_TOOL,
  VCS_DESCRIBE_TOOL,
  VCS_FILE_DIFF_TOOL,
  VCS_FILE_HISTORY_SHOW_TOOL,
  VCS_FILE_HISTORY_TOOL,
  VCS_FILE_SPLIT_TOOL,
  VCS_HUNK_LIST_TOOL,
  VCS_HUNK_SPLIT_TOOL,
  VCS_LOG_TOOL,
  VCS_OPLOG_TOOL,
} from "../constants";
import type {
  ConflictRow,
  HistoryRow,
  HunkRow,
  LogRow,
  OplogRow,
  VcsCell,
  VcsRowView,
  VcsToolStatus,
  VcsToolView,
} from "../types";

type Args = Record<string, unknown>;
type Details = Record<string, unknown>;

const STATUSES: readonly string[] = [
  "ok",
  "failed",
  "unsupported",
  "empty-selected",
  "empty",
  "none",
  "binary",
];

/** What one tool's details must carry, and who folds them into the view. */
interface ToolViewShape {
  /** details keys that have to read as text or numbers */
  scalars: readonly string[];
  /** details keys that have to read as tables */
  lists: readonly string[];
  fold(args: Args, details: Details, itemStatus: string): VcsToolView;
}

/**
 * The ten tools by the name they answer under: the keys their details promise
 * and the view that reads them. A tool missing here has no view, and a tool
 * whose details miss a promised key has no view either — both mean the log
 * falls back to the tool's own `content` text.
 */
const VIEW_OF_TOOL: ReadonlyMap<string, ToolViewShape> = new Map([
  [
    VCS_LOG_TOOL,
    {
      scalars: ["rev", "commit_count"],
      lists: ["rows"],
      fold: (args, details, status) => logView(args, details, status),
    },
  ],
  [
    VCS_FILE_DIFF_TOOL,
    {
      scalars: ["path", "diff_line_count"],
      lists: [],
      fold: (_args, details, status) => diffView(details, status),
    },
  ],
  [
    VCS_FILE_HISTORY_TOOL,
    {
      scalars: ["path", "revision_count"],
      lists: ["rows"],
      fold: (_args, details, status) => historyView(details, status),
    },
  ],
  [
    VCS_FILE_HISTORY_SHOW_TOOL,
    {
      scalars: ["path", "lines"],
      lists: [],
      fold: (_args, details, status) => showView(details, status),
    },
  ],
  [
    VCS_CONFLICTS_TOOL,
    {
      scalars: ["rev", "conflict_count", "file_count"],
      lists: ["rows"],
      fold: (_args, details, status) => conflictsView(details, status),
    },
  ],
  [
    VCS_OPLOG_TOOL,
    {
      scalars: ["op_count"],
      lists: ["rows"],
      fold: (_args, details, status) => oplogView(details, status),
    },
  ],
  [
    VCS_DESCRIBE_TOOL,
    {
      scalars: ["commit", "change", "message"],
      lists: [],
      fold: (args, details, status) => describeView(args, details, status),
    },
  ],
  [
    VCS_FILE_SPLIT_TOOL,
    {
      scalars: ["rev", "selected_change", "remaining_change"],
      lists: [],
      fold: (args, details, status) =>
        splitView(VCS_FILE_SPLIT_TOOL, args, details, status),
    },
  ],
  [
    VCS_HUNK_SPLIT_TOOL,
    {
      scalars: ["rev", "selected_change", "remaining_change"],
      lists: [],
      fold: (args, details, status) =>
        splitView(VCS_HUNK_SPLIT_TOOL, args, details, status),
    },
  ],
  [
    VCS_HUNK_LIST_TOOL,
    {
      scalars: ["rev", "hunk_count"],
      lists: ["rows"],
      fold: (args, details, status) => hunkListView(args, details, status),
    },
  ],
]);

/**
 * Folds one vcs tool call's details into the shared view: `headline` the
 * summary sentence, `cells` the resolved identities, `rows` the data, `note`
 * the failure or explanation, `patch` the diff body, `content` the file body.
 * Null when the details are absent or unshaped — a running call, a non-vcs
 * tool, details of a shape this file does not know.
 */
export function vcsToolViewOf(
  name: string,
  args: Record<string, unknown> | undefined,
  details: unknown,
  itemStatus: string,
): VcsToolView | null {
  const shape = VIEW_OF_TOOL.get(name.toLowerCase());
  if (shape === undefined) return null;

  const found = recordOf(details);
  if (found === null) return null;
  if (!shaped(found, shape.scalars, shape.lists)) return null;

  return shape.fold(recordOf(args) ?? {}, found, itemStatus);
}

function recordOf(value: unknown): Details | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Details)
    : null;
}

/** Details carry their scalars as text/numbers and their tables as arrays. */
function shaped(
  details: Details,
  scalars: readonly string[],
  lists: readonly string[],
): boolean {
  return (
    scalars.every(
      (key) =>
        typeof details[key] === "string" || typeof details[key] === "number",
    ) && lists.every((key) => Array.isArray(details[key]))
  );
}

function view(tool: string, status: VcsToolStatus): VcsToolView {
  return {
    tool,
    status,
    headline: "",
    cells: [],
    rows: [],
    note: "",
    patch: "",
    content: "",
  };
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberOf(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function rowsOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** The first non-empty line, for a description or a one-line summary. */
function firstLineOf(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  return (
    raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")[0] ?? ""
  );
}

/** A list read from args (`files`, `hunks`), joined for display. */
function listArg(args: Args, key: string): string {
  const value = args[key];
  if (Array.isArray(value))
    return value
      .map((entry) => textOf(entry))
      .filter((entry) => entry !== "")
      .join(", ");
  return textOf(value);
}

/** The tool's own status, overridden when the call itself failed. */
function statusOf(details: Details, itemStatus: string): VcsToolStatus {
  if (itemStatus === "error") return "failed";
  const raw = details.status;
  return typeof raw === "string" && STATUSES.includes(raw)
    ? (raw as VcsToolStatus)
    : "ok";
}

function errorOf(details: Details): string {
  return firstLineOf(details.error);
}

/** A note only for a state the log has to explain — never for a clean read. */
function noteFor(
  status: VcsToolStatus,
  details: Details,
  empty: string,
): string {
  if (
    status === "failed" ||
    status === "unsupported" ||
    status === "empty-selected"
  )
    return errorOf(details);
  return status === "ok" ? "" : empty;
}

function cellsOf(...pairs: readonly (readonly [string, string])[]): VcsCell[] {
  return pairs
    .filter(([, value]) => value !== "")
    .map(([label, value]) => ({ label, value }));
}

function rowOf(
  key: string,
  primary: string,
  secondary: string,
  badge: string,
): VcsRowView {
  return { key, primary, secondary, badge };
}

/** "12 commits" / "1 commit" — the count a headline opens with. */
function counted(count: number, one: string): string {
  return `${String(count)} ${count === 1 ? one : `${one}s`}`;
}

function tail(...parts: readonly string[]): string {
  return parts
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .join(" · ");
}

const SCOPE_OF = (rev: string): string => (rev === "" ? "(all)" : rev);

/** A tree diff is asked for as `path="*"`, which the log says in words. */
function pathLabel(path: string): string {
  return path === "" || path === "*" ? "whole tree" : path;
}

/** The log: scope chips, one row per commit, the scope in the headline. */
function logView(
  args: Args,
  details: Details,
  itemStatus: string,
): VcsToolView {
  const status = statusOf(details, itemStatus);
  const v = view(VCS_LOG_TOOL, status);
  const scope = textOf(details.rev);
  const bookmark = textOf(args.bookmark);
  const commits = rowsOf<LogRow>(details.rows);

  v.cells = cellsOf(
    ["vcs", textOf(details.vcs)],
    ["rev", SCOPE_OF(scope)],
    ["bookmark", bookmark],
    ["format", args.format === "full" ? "full" : ""],
  );
  v.headline =
    commits.length === 0 ? "" : tail(counted(commits.length, "commit"), scope);
  v.rows = commits.map((row) =>
    rowOf(
      row.change,
      firstLineOf(row.description) === ""
        ? "(no description)"
        : firstLineOf(row.description),
      tail(row.author, row.date, row.commit),
      [row.bookmarks, row.tags]
        .map((part) => part.trim())
        .filter((part) => part !== "")
        .join(" "),
    ),
  );
  v.note =
    status === "ok" && commits.length === 0
      ? `no commits match ${SCOPE_OF(scope)}`
      : noteFor(status, details, `no commits match ${SCOPE_OF(scope)}`);
  return v;
}

/** The patch: both ends resolved into chips, the diff body for ToolDiff. */
function diffView(details: Details, itemStatus: string): VcsToolView {
  const status = statusOf(details, itemStatus);
  const v = view(VCS_FILE_DIFF_TOOL, status);
  const path = textOf(details.path);
  const label = pathLabel(path);
  const from = textOf(details.from);
  const to = textOf(details.to);
  const toLabel = to === "" ? "working copy" : to;
  const lines = numberOf(details.diff_line_count);

  v.cells = cellsOf(
    ["from", textOf(details.from_change)],
    ["from git", textOf(details.from_git)],
    ["to", textOf(details.to_change)],
    ["to git", textOf(details.to_git)],
    ["path", label],
  );
  v.headline =
    status === "ok" && lines > 0
      ? tail(`${counted(lines, "line")} of patch`, label)
      : "";
  v.patch = typeof details.diff === "string" ? details.diff : "";
  v.note = noteFor(
    status,
    details,
    `no changes for ${label} between ${SCOPE_OF(from)} and ${toLabel}`,
  );
  return v;
}

/** File history: one row per revision that touched the path. */
function historyView(details: Details, itemStatus: string): VcsToolView {
  const status = statusOf(details, itemStatus);
  const v = view(VCS_FILE_HISTORY_TOOL, status);
  const path = textOf(details.path);
  const revisions = rowsOf<HistoryRow>(details.rows);

  v.cells = cellsOf(["path", path], ["vcs", textOf(details.vcs)]);
  v.headline =
    revisions.length === 0
      ? ""
      : tail(counted(revisions.length, "revision"), path);
  v.rows = revisions.map((row, index) =>
    rowOf(
      row.change === "" ? row.hash : row.change,
      firstLineOf(row.subject) === ""
        ? "(no description)"
        : firstLineOf(row.subject),
      tail(row.hash, row.author, row.date),
      `#${String(index + 1)}`,
    ),
  );
  v.note = noteFor(status, details, `no revisions touch ${path}`);
  return v;
}

/** A file at a revision: the body to paint, a binary read says so. */
function showView(details: Details, itemStatus: string): VcsToolView {
  const status = statusOf(details, itemStatus);
  const v = view(VCS_FILE_HISTORY_SHOW_TOOL, status);
  const path = textOf(details.path);
  const lines = numberOf(details.lines);

  v.cells = cellsOf(
    ["hash", textOf(details.hash)],
    ["change", textOf(details.change)],
    ["path", path],
    ["lines", lines === 0 ? "" : String(lines)],
  );
  v.headline = status === "ok" ? tail(counted(lines, "line"), path) : "";
  v.content =
    status === "binary"
      ? ""
      : typeof details.content === "string"
        ? details.content
        : "";
  v.note = noteFor(
    status,
    details,
    status === "binary"
      ? `${path} is binary — its bytes are not shown`
      : `${path} is empty at this revision`,
  );
  return v;
}

/** Conflicts: a clean repo is a `none` state, not an empty table. */
function conflictsView(details: Details, itemStatus: string): VcsToolView {
  const status = statusOf(details, itemStatus);
  const files = rowsOf<ConflictRow>(details.rows);
  const revisions = numberOf(details.conflict_count);
  const clean = status === "none" || (status === "ok" && files.length === 0);
  const v = view(VCS_CONFLICTS_TOOL, clean ? "none" : status);

  v.cells = cellsOf(
    ["vcs", textOf(details.vcs)],
    ["rev", SCOPE_OF(textOf(details.rev))],
    ["revisions", revisions === 0 ? "" : String(revisions)],
  );
  v.headline = clean
    ? ""
    : tail(
        counted(files.length, "file"),
        `${counted(revisions, "revision")} conflicted`,
      );
  v.rows = files.map((row) =>
    rowOf(
      row.change,
      row.path,
      tail(row.commit, row.sides),
      row.working_copy ? "working copy" : "commit",
    ),
  );
  v.note = clean ? "no conflicts found" : noteFor(status, details, "");
  return v;
}

/** The operation log: one row per operation, the op id as the key. */
function oplogView(details: Details, itemStatus: string): VcsToolView {
  const status = statusOf(details, itemStatus);
  const v = view(VCS_OPLOG_TOOL, status);
  const ops = rowsOf<OplogRow>(details.rows);

  v.cells = cellsOf(["vcs", textOf(details.vcs)]);
  v.headline = ops.length === 0 ? "" : counted(ops.length, "operation");
  v.rows = ops.map((row) =>
    rowOf(row.op, firstLineOf(row.description), row.time, ""),
  );
  v.note = noteFor(status, details, "no operations in the op log");
  return v;
}

/**
 * Describe: the message is the headline. The chips already carry the change id and
 * commit it ends on, so only a change id that actually moved is worth a row.
 */
function describeView(
  args: Args,
  details: Details,
  itemStatus: string,
): VcsToolView {
  const status = statusOf(details, itemStatus);
  const v = view(VCS_DESCRIBE_TOOL, status);
  const change = textOf(details.change);
  const commit = textOf(details.commit);
  const asked = textOf(args.hash);
  const previousChange = textOf(details.previous_change);
  const previousCommit = textOf(details.previous_commit);
  const message = firstLineOf(details.message);
  const rewritten = previousChange !== "" && previousChange !== change;

  // The header already prints the rev as the model asked for it, so the chip
  // earns its place only when that rev is not just a prefix of the change.
  const askedIsThisChange =
    asked !== "" && change.toLowerCase().startsWith(asked.toLowerCase());
  v.cells = askedIsThisChange
    ? cellsOf(["change", change], ["commit", commit])
    : cellsOf(["rev", asked], ["change", change], ["commit", commit]);
  v.headline =
    status === "ok" ? (message === "" ? "(no description)" : message) : "";
  // The key column says the row is the state before, so no badge repeats it.
  v.rows = rewritten ? [rowOf("was", previousChange, previousCommit, "")] : [];
  v.note = noteFor(
    status,
    details,
    rewritten ? "" : "the description is unchanged",
  );
  return v;
}

/**
 * Both splits share a shape: pre-state chips, then the two roles. The role is
 * said once, in the key column, and an id is said once per chip and per row.
 */
function splitView(
  tool: string,
  args: Args,
  details: Details,
  itemStatus: string,
): VcsToolView {
  const status = statusOf(details, itemStatus);
  const v = view(tool, status);
  const files =
    tool === VCS_FILE_SPLIT_TOOL
      ? textOf(details.files)
      : listArg(args, "hunks");
  const selectedChange = textOf(details.selected_change);
  const remainingChange = textOf(details.remaining_change);

  const rev = textOf(details.rev);
  const change = textOf(details.change);

  // A rev named by change id resolves to that very change, so the change chip
  // would print again the id the rev chip already prints.
  v.cells = cellsOf(
    ["rev", rev],
    ["git", textOf(details.git)],
    ["change", change === rev ? "" : change],
    [tool === VCS_FILE_SPLIT_TOOL ? "files" : "hunks", files],
    ["insert_after", textOf(details.insert_after)],
  );
  v.headline = status === "ok" ? "split into 2 changes" : "";
  // The key column already names the role, so a badge would only repeat it;
  // the row is the role, its change id and the commit that change ends on.
  v.rows = [
    rowOf("selected", selectedChange, textOf(details.selected_git), ""),
    rowOf("remaining", remainingChange, textOf(details.remaining_git), ""),
  ].filter((row) => row.primary !== "" || row.secondary !== "");
  v.note = noteFor(status, details, "the selected fileset matched no hunks");
  return v;
}

/** Hunks: the file is the row, the hunk id the key, the ranges the pair. */
function hunkListView(
  args: Args,
  details: Details,
  itemStatus: string,
): VcsToolView {
  const status = statusOf(details, itemStatus);
  const v = view(VCS_HUNK_LIST_TOOL, status);
  const rev = textOf(details.rev);
  const hunks = rowsOf<HunkRow>(details.rows);
  const files = new Set(
    hunks.map((row) => row.file).filter((file) => file !== ""),
  );

  v.cells = cellsOf(
    ["rev", rev],
    ["git", textOf(details.git)],
    ["change", textOf(details.change)],
    ["files", files.size === 0 ? "" : counted(files.size, "file")],
  );
  v.headline =
    hunks.length === 0 ? "" : tail(counted(hunks.length, "hunk"), rev);
  // The badge says the hunk's type, so the muted line does not say it twice.
  v.rows = hunks.map((row) =>
    rowOf(row.hunk, row.file, `${row.before} → ${row.after}`, row.type),
  );
  v.note = noteFor(status, details, `no hunks for ${SCOPE_OF(rev)}`);
  return v;
}
