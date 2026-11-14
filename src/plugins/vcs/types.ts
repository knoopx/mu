import type { ToolPaintRow, ToolRowCell } from "../core/lib/ui/toolRowPaint";

export interface RevsetDef {
  label: string;
  revset: string;
}

export type VcsToolStatus =
  | "ok"
  | "failed"
  | "unsupported"
  | "empty-selected"
  | "empty"
  | "none"
  | "binary";

export interface RevisionIds {
  git: string;
  change: string;
}

export interface HunkRow {
  file: string;
  hunk: string;
  type: string;
  before: string;
  after: string;
}

export interface SplitOutcome {
  status: VcsToolStatus;
  selected: RevisionIds;
  remaining: RevisionIds;
  error: string;
}

export interface VcsDescribeParams {
  hash: string;
  message: string;
}

export interface VcsDescribeDetails {
  commit: string;
  change: string;
  previous_commit: string;
  previous_change: string;
  message: string;
  status: VcsToolStatus;
  error: string;
}

export interface VcsFileSplitParams {
  rev: string;
  files: string[];
  message: string;
  insertAfter?: string;
}

export interface VcsHunkSplitParams {
  rev: string;
  hunks: string[];
  message: string;
  insertAfter?: string;
}

export interface VcsSplitDetails {
  rev: string;
  git: string;
  change: string;
  selected_git: string;
  selected_change: string;
  remaining_git: string;
  remaining_change: string;
  insert_after: string;
  status: VcsToolStatus;
  error: string;
}

export interface VcsFileSplitDetails extends VcsSplitDetails {
  files: string;
}

export interface VcsHunkListParams {
  rev: string;
  files?: string;
}

export interface VcsHunkListDetails {
  rev: string;
  git: string;
  change: string;
  status: VcsToolStatus;
  hunk_count: number;
  rows: HunkRow[];
  error: string;
}

/** Which half of a two-half panel holds the cursor: its list, or the files in it. */
export type FilePanelFocus = "stack" | "files";

/** The panels the plugin draws in the composer slot that have a list and files. */
export type VcsPanelKind = "changes" | "oplog";

export type NavDirection = "up" | "down" | "pageUp" | "pageDown";

export interface LogRow {
  change: string;
  commit: string;
  author: string;
  date: string;
  description: string;
  bookmarks: string;
  tags: string;
  files: string;
}

export interface HistoryRow {
  hash: string;
  change: string;
  author: string;
  date: string;
  subject: string;
}

export interface OplogRow {
  op: string;
  time: string;
  description: string;
}

export interface ConflictRow {
  change: string;
  commit: string;
  path: string;
  sides: string;
  working_copy: boolean;
}

export interface VcsLogParams {
  rev?: string;
  bookmark?: string;
  oldest_first?: boolean;
  limit?: number;
  offset?: number;
  format?: "compact" | "full";
}

export interface VcsLogDetails {
  vcs: string;
  rev: string;
  status: VcsToolStatus;
  commit_count: number;
  rows: LogRow[];
  error: string;
}

export interface VcsFileDiffParams {
  path: string;
  from: string;
  to?: string;
}

export interface VcsFileDiffDetails {
  from: string;
  to: string;
  path: string;
  from_git: string;
  from_change: string;
  to_git: string;
  to_change: string;
  status: VcsToolStatus;
  diff_line_count: number;
  diff: string;
  error: string;
}

export interface VcsFileHistoryParams {
  path: string;
  limit?: number;
  offset?: number;
}

export interface VcsFileHistoryDetails {
  vcs: string;
  path: string;
  status: VcsToolStatus;
  revision_count: number;
  rows: HistoryRow[];
  error: string;
}

export interface VcsFileShowParams {
  path: string;
  hash: string;
}

export interface VcsFileShowDetails {
  hash: string;
  change: string;
  path: string;
  status: VcsToolStatus;
  lines: number;
  content: string;
  error: string;
}

export interface VcsConflictsParams {
  rev?: string;
  path?: string;
}

export interface VcsConflictsDetails {
  vcs: string;
  rev: string;
  status: VcsToolStatus;
  conflict_count: number;
  file_count: number;
  rows: ConflictRow[];
  error: string;
}

export interface VcsOplogParams {
  limit?: number;
  offset?: number;
  oldest_first?: boolean;
  format?: "compact" | "full";
}

export interface VcsOplogDetails {
  vcs: string;
  status: VcsToolStatus;
  op_count: number;
  rows: OplogRow[];
  error: string;
}

/** A chip of what the call resolved, and a row of its table — the shapes the shared row painter draws. */
export type VcsCell = ToolRowCell;

export type VcsRowView = ToolPaintRow;

export interface VcsToolView {
  tool: string;
  status: VcsToolStatus | "";
  headline: string;
  cells: VcsCell[];
  rows: VcsRowView[];
  note: string;
  patch: string;
  content: string;
}
