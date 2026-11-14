/**
 * Turns what a vcs tool answered into what the transcript draws. The ten
 * tools answer two audiences: `content` text in aligned columns for the
 * model, and structured `details` for the log. This file folds the details
 * into one `VcsToolView` so the components never parse a tool's shape, and
 * it names no tool string — every tool is matched by its constant.
 *
 * A details shape is declared once, in `../types.ts`, and it is read here
 * through that same interface: the keys the call promises are `keyof` that
 * interface and each fold takes it as its argument. A field renamed in
 * `types.ts` is therefore a compile error in this file — which used to be a
 * row that silently lost its chips and fell back to the tool's own text.
 */

import {
  hasNoDescription,
  NO_DESCRIPTION,
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
import { firstLine } from "../../../utils/truncate";
import {
  detailList,
  detailNumber,
  detailRecord,
  detailStrings,
  detailText,
  detailWord,
} from "../../core/lib/agent/toolDetails";
import type {
  ConflictRow,
  HistoryRow,
  HunkRow,
  LogRow,
  OplogRow,
  VcsCell,
  VcsConflictsDetails,
  VcsConflictsParams,
  VcsDescribeDetails,
  VcsDescribeParams,
  VcsFileDiffDetails,
  VcsFileDiffParams,
  VcsFileHistoryDetails,
  VcsFileHistoryParams,
  VcsFileShowDetails,
  VcsFileShowParams,
  VcsFileSplitDetails,
  VcsFileSplitParams,
  VcsHunkListDetails,
  VcsHunkListParams,
  VcsHunkSplitParams,
  VcsLogDetails,
  VcsLogParams,
  VcsOplogDetails,
  VcsOplogParams,
  VcsRowView,
  VcsSplitDetails,
  VcsToolStatus,
  VcsToolView,
} from "../types";

/** The arguments as they arrive on the call: JSON, whatever the tool asked for. */
type Args = Record<string, unknown>;

const STATUSES = [
  "ok",
  "failed",
  "unsupported",
  "empty-selected",
  "empty",
  "none",
  "binary",
] as const satisfies readonly VcsToolStatus[];

/** One entry of the table below: the keys checked, and the fold that reads them. */
interface ErasedViewShape {
  /** details keys that have to read as text or numbers */
  scalars: readonly string[];
  /** details keys that have to read as tables */
  lists: readonly string[];
  fold(args: Args, details: Args, itemStatus: string): VcsToolView;
}

/**
 * One tool's row: which of its details keys have to read as a scalar and which
 * as a table, and the fold that reads them. Both key lists are `keyof D`, and
 * the fold takes `D` and the tool's own params — so the table cannot name a key
 * the details interface does not have, and the fold cannot read a field that was
 * never answered. The shape check stays at runtime: a session resumed this week
 * holds JSON, not the object this tool returned.
 */
const viewShape = <P, D>(
  scalars: readonly (keyof D & string)[],
  lists: readonly (keyof D & string)[],
  fold: (args: P, details: D, itemStatus: string) => VcsToolView,
): ErasedViewShape => ({
  scalars,
  lists,
  // The one erased read: the fold is only ever handed the details this entry
  // names its keys by, after `shaped` has checked those keys are there.
  fold: fold as (args: Args, details: Args, itemStatus: string) => VcsToolView,
});

/**
 * The ten tools by the name they answer under: the keys their details promise
 * and the view that reads them. A tool missing here has no view, and a tool
 * whose details miss a promised key has no view either — both mean the log
 * falls back to the tool's own `content` text.
 */
const VIEW_OF_TOOL: ReadonlyMap<string, ErasedViewShape> = new Map([
  [
    VCS_LOG_TOOL,
    viewShape<VcsLogParams, VcsLogDetails>(
      ["rev", "commit_count"],
      ["rows"],
      logView,
    ),
  ],
  [
    VCS_FILE_DIFF_TOOL,
    viewShape<VcsFileDiffParams, VcsFileDiffDetails>(
      ["path", "diff_line_count"],
      [],
      (_args, details, status) => diffView(details, status),
    ),
  ],
  [
    VCS_FILE_HISTORY_TOOL,
    viewShape<VcsFileHistoryParams, VcsFileHistoryDetails>(
      ["path", "revision_count"],
      ["rows"],
      (_args, details, status) => historyView(details, status),
    ),
  ],
  [
    VCS_FILE_HISTORY_SHOW_TOOL,
    viewShape<VcsFileShowParams, VcsFileShowDetails>(
      ["path", "lines"],
      [],
      (_args, details, status) => showView(details, status),
    ),
  ],
  [
    VCS_CONFLICTS_TOOL,
    viewShape<VcsConflictsParams, VcsConflictsDetails>(
      ["rev", "conflict_count", "file_count"],
      ["rows"],
      (_args, details, status) => conflictsView(details, status),
    ),
  ],
  [
    VCS_OPLOG_TOOL,
    viewShape<VcsOplogParams, VcsOplogDetails>(
      ["op_count"],
      ["rows"],
      (_args, details, status) => oplogView(details, status),
    ),
  ],
  [
    VCS_DESCRIBE_TOOL,
    viewShape<VcsDescribeParams, VcsDescribeDetails>(
      ["commit", "change", "message"],
      [],
      describeView,
    ),
  ],
  [
    VCS_FILE_SPLIT_TOOL,
    viewShape<VcsFileSplitParams, VcsFileSplitDetails>(
      ["rev", "selected_change", "remaining_change"],
      [],
      (args, details, status) =>
        splitView(
          VCS_FILE_SPLIT_TOOL,
          args,
          details,
          status,
          detailText(details.files),
        ),
    ),
  ],
  [
    VCS_HUNK_SPLIT_TOOL,
    viewShape<VcsHunkSplitParams, VcsSplitDetails>(
      ["rev", "selected_change", "remaining_change"],
      [],
      (args, details, status) =>
        splitView(
          VCS_HUNK_SPLIT_TOOL,
          args,
          details,
          status,
          detailStrings(args.hunks).join(", "),
        ),
    ),
  ],
  [
    VCS_HUNK_LIST_TOOL,
    viewShape<VcsHunkListParams, VcsHunkListDetails>(
      ["rev", "hunk_count"],
      ["rows"],
      (_args, details, status) => hunkListView(details, status),
    ),
  ],
]);

/**
 * Folds one vcs tool call's details into the shared view: `headline` the
 * summary sentence, `cells` the resolved identities, `rows` the data, `note`
 * the failure or explanation, `patch` the diff body, `content` the body of text
 * the call read or wrote (a file at a revision, the description a describe left).
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

  const found = detailRecord(details);
  if (found === null) return null;
  if (!shaped(found, shape.scalars, shape.lists)) return null;

  return shape.fold(detailRecord(args) ?? {}, found, itemStatus);
}

/** Details carry their scalars as text/numbers and their tables as arrays. */
function shaped(
  details: Args,
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

/** The word lists are trimmed as they are read: the change tracker pads them. */
const textOf = (value: unknown): string => detailText(value).trim();

/** A cell of a tool's `details` is not always a string; its first line, whatever it is. */
const firstLineOf = (value: unknown): string =>
  firstLine(typeof value === "string" ? value : "");

/** The tool's own status, overridden when the call itself failed. */
function statusOf(
  details: { status: VcsToolStatus },
  itemStatus: string,
): VcsToolStatus {
  if (itemStatus === "error") return "failed";
  return detailWord(details.status, STATUSES) ?? "ok";
}

function errorOf(details: { error: string }): string {
  return firstLineOf(details.error);
}

/** A note only for a state the log has to explain — never for a clean read. */
function noteFor(
  status: VcsToolStatus,
  details: { error: string },
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

/** One table row. `quiet` says the primary line is a placeholder — a change with
 *  nothing written on it is quiet in the change stack, and is quiet here too, or
 *  the log is a column of the same bright words and the descriptions a reader
 *  came for are the ones that do not stand out.
 */
function rowOf(
  key: string,
  primary: string,
  secondary: string,
  badge: string,
  trailing = "",
  quiet = false,
): VcsRowView {
  return {
    key,
    // A vcs row is its revision: the short id stands in the key column and the
    // change id rides the secondary line, where the full one is readable.
    id: key,
    primary,
    secondary,
    badge,
    trailing,
    primaryMuted: quiet,
  };
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
  args: VcsLogParams,
  details: VcsLogDetails,
  itemStatus: string,
): VcsToolView {
  const status = statusOf(details, itemStatus);
  const v = view(VCS_LOG_TOOL, status);
  const scope = textOf(details.rev);
  const bookmark = textOf(args.bookmark);
  const commits = detailList<LogRow>(details.rows);

  v.cells = cellsOf(
    ["vcs", textOf(details.vcs)],
    ["rev", SCOPE_OF(scope)],
    ["bookmark", bookmark],
    ["format", args.format === "full" ? "full" : ""],
  );
  v.headline = commits.length === 0 ? "" : counted(commits.length, "commit");
  v.rows = commits.map((row) => {
    const quiet = hasNoDescription(row.description);
    return rowOf(
      row.change,
      quiet ? NO_DESCRIPTION : firstLineOf(row.description),
      tail(row.author, row.date, row.commit),
      [row.bookmarks, row.tags]
        .map((part) => part.trim())
        .filter((part) => part !== "")
        .join(" "),
      "",
      quiet,
    );
  });
  v.note =
    status === "ok" && commits.length === 0
      ? `no commits match ${SCOPE_OF(scope)}`
      : noteFor(status, details, `no commits match ${SCOPE_OF(scope)}`);
  return v;
}

/** The patch: both ends resolved into chips, the diff body for ToolDiff. */
function diffView(
  details: VcsFileDiffDetails,
  itemStatus: string,
): VcsToolView {
  const status = statusOf(details, itemStatus);
  const v = view(VCS_FILE_DIFF_TOOL, status);
  const path = textOf(details.path);
  const label = pathLabel(path);
  const from = textOf(details.from);
  const to = textOf(details.to);
  const toLabel = to === "" ? "working copy" : to;
  const lines = detailNumber(details.diff_line_count);

  v.cells = cellsOf(
    ["from", textOf(details.from_change)],
    ["from git", textOf(details.from_git)],
    ["to", textOf(details.to_change)],
    ["to git", textOf(details.to_git)],
    ["path", label],
  );
  v.headline =
    status === "ok" && lines > 0 ? `${counted(lines, "line")} of patch` : "";
  v.patch = detailText(details.diff);
  v.note = noteFor(
    status,
    details,
    `no changes for ${label} between ${SCOPE_OF(from)} and ${toLabel}`,
  );
  return v;
}

/** File history: one row per revision that touched the path. */
function historyView(
  details: VcsFileHistoryDetails,
  itemStatus: string,
): VcsToolView {
  const status = statusOf(details, itemStatus);
  const v = view(VCS_FILE_HISTORY_TOOL, status);
  const path = textOf(details.path);
  const revisions = detailList<HistoryRow>(details.rows);

  v.cells = cellsOf(["path", path], ["vcs", textOf(details.vcs)]);
  // The count only: the path is a chip and the header already says it, and a
  // headline that repeats it spends the line on nothing new.
  v.headline =
    revisions.length === 0 ? "" : counted(revisions.length, "revision");
  v.rows = revisions.map((row, index) => {
    const quiet = hasNoDescription(row.subject);
    return rowOf(
      row.change === "" ? row.hash : row.change,
      quiet ? NO_DESCRIPTION : firstLineOf(row.subject),
      tail(row.hash, row.author, row.date),
      // A position, not a state: it stands in the mono figure column, not in a
      // status pill, or an ordinal wears the face of a word like `conflicted`.
      "",
      `#${String(index + 1)}`,
      quiet,
    );
  });
  v.note = noteFor(status, details, `no revisions touch ${path}`);
  return v;
}

/** A file at a revision: the body to paint, a binary read says so. */
function showView(
  details: VcsFileShowDetails,
  itemStatus: string,
): VcsToolView {
  const status = statusOf(details, itemStatus);
  const v = view(VCS_FILE_HISTORY_SHOW_TOOL, status);
  const path = textOf(details.path);
  const lines = detailNumber(details.lines);

  v.cells = cellsOf(
    ["hash", textOf(details.hash)],
    ["change", textOf(details.change)],
    ["path", path],
    ["lines", lines === 0 ? "" : String(lines)],
  );
  v.headline = status === "ok" ? counted(lines, "line") : "";
  v.content = status === "binary" ? "" : detailText(details.content);
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
function conflictsView(
  details: VcsConflictsDetails,
  itemStatus: string,
): VcsToolView {
  const status = statusOf(details, itemStatus);
  const files = detailList<ConflictRow>(details.rows);
  const revisions = detailNumber(details.conflict_count);
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
function oplogView(details: VcsOplogDetails, itemStatus: string): VcsToolView {
  const status = statusOf(details, itemStatus);
  const v = view(VCS_OPLOG_TOOL, status);
  const ops = detailList<OplogRow>(details.rows);

  v.cells = cellsOf(["vcs", textOf(details.vcs)]);
  v.headline = ops.length === 0 ? "" : counted(ops.length, "operation");
  v.rows = ops.map((row) =>
    rowOf(row.op, firstLineOf(row.description), row.time, ""),
  );
  v.note = noteFor(status, details, "no operations in the op log");
  return v;
}

/**
 * Describe: the message is the answer, so it is the card's `content` and not the
 * header's one clipped line — a description is a subject and a body, and a header
 * that carries the subject throws the rest of the message away. The header's line
 * says which revision the write landed on, the chips the commit it ends on, and
 * only a change id that actually moved is worth a row.
 */
function describeView(
  args: VcsDescribeParams,
  details: VcsDescribeDetails,
  itemStatus: string,
): VcsToolView {
  const status = statusOf(details, itemStatus);
  const v = view(VCS_DESCRIBE_TOOL, status);
  const change = textOf(details.change);
  const commit = textOf(details.commit);
  const asked = textOf(args.hash);
  const previousChange = textOf(details.previous_change);
  const previousCommit = textOf(details.previous_commit);
  const message = textOf(details.message);
  const rewritten = previousChange !== "" && previousChange !== change;

  // The header already prints the rev as the model asked for it, so the chip
  // earns its place only when that rev is not just a prefix of the change.
  const askedIsThisChange =
    asked !== "" && change.toLowerCase().startsWith(asked.toLowerCase());
  v.cells = askedIsThisChange
    ? cellsOf(["change", change], ["commit", commit])
    : cellsOf(["rev", asked], ["change", change], ["commit", commit]);
  v.headline = "";
  // The key column says the row is the state before, so no badge repeats it.
  v.rows = rewritten ? [rowOf("was", previousChange, previousCommit, "")] : [];
  v.content = status === "ok" ? message : "";
  // A description that landed empty is the one ok state the card has to say in
  // words, because it has nothing else to show.
  v.note =
    status === "ok"
      ? message === ""
        ? NO_DESCRIPTION
        : ""
      : noteFor(status, details, "");
  return v;
}

/**
 * Both splits share a shape: pre-state chips, then the two roles. The role is
 * said once, in the key column, and an id is said once per chip and per row.
 */
function splitView(
  tool: string,
  args: VcsFileSplitParams | VcsHunkSplitParams,
  details: VcsSplitDetails,
  itemStatus: string,
  scope: string,
): VcsToolView {
  const status = statusOf(details, itemStatus);
  const v = view(tool, status);
  const files = scope;
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
  details: VcsHunkListDetails,
  itemStatus: string,
): VcsToolView {
  const status = statusOf(details, itemStatus);
  const v = view(VCS_HUNK_LIST_TOOL, status);
  const rev = textOf(details.rev);
  const hunks = detailList<HunkRow>(details.rows);
  const files = new Set(
    hunks.map((row) => row.file).filter((file) => file !== ""),
  );

  v.cells = cellsOf(
    ["rev", rev],
    ["git", textOf(details.git)],
    ["change", textOf(details.change)],
    // The label is the unit, so the value is only the figure.
    ["files", files.size === 0 ? "" : String(files.size)],
  );
  v.headline = hunks.length === 0 ? "" : counted(hunks.length, "hunk");
  // The badge says the hunk's type, so the muted line does not say it twice.
  v.rows = hunks.map((row) =>
    rowOf(row.hunk, row.file, `${row.before} → ${row.after}`, row.type),
  );
  v.note = noteFor(status, details, `no hunks for ${SCOPE_OF(rev)}`);
  return v;
}
