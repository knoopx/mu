import type { BadgeVariant } from "adwaita-gpuix";

import type { RevsetDef } from "./types";

const DEFAULT_REVSET_LABEL = "Stack";

export const REVSETS: readonly RevsetDef[] = [
  { label: DEFAULT_REVSET_LABEL, revset: "ancestors(@, 50) ~ root()" },
  { label: "Heads", revset: "visible_heads()" },
  { label: "Conflicts", revset: "conflicts()" },
  { label: "Mine", revset: "mine()" },
  { label: "Tracked", revset: "bookmarks()" },
  { label: "Recent", revset: "committer_date(after:'30 days ago')" },
];

export const FALLBACK_PAGE_ROWS = 10;

export const VCS_LOG_TOOL = "vcs-log";
export const VCS_FILE_DIFF_TOOL = "vcs-file-diff";
export const VCS_FILE_HISTORY_TOOL = "vcs-file-history";
export const VCS_FILE_HISTORY_SHOW_TOOL = "vcs-file-history-show";
export const VCS_CONFLICTS_TOOL = "vcs-conflicts";
export const VCS_OPLOG_TOOL = "vcs-oplog";
export const VCS_DESCRIBE_TOOL = "vcs-describe";
export const VCS_FILE_SPLIT_TOOL = "vcs-file-split";
export const VCS_HUNK_LIST_TOOL = "vcs-hunk-list";
export const VCS_HUNK_SPLIT_TOOL = "vcs-hunk-split";

/** Every vcs tool the agent can call, in read-then-write order. */
export const VCS_TOOL_NAMES: readonly string[] = [
  VCS_LOG_TOOL,
  VCS_FILE_DIFF_TOOL,
  VCS_FILE_HISTORY_TOOL,
  VCS_FILE_HISTORY_SHOW_TOOL,
  VCS_CONFLICTS_TOOL,
  VCS_OPLOG_TOOL,
  VCS_DESCRIBE_TOOL,
  VCS_FILE_SPLIT_TOOL,
  VCS_HUNK_LIST_TOOL,
  VCS_HUNK_SPLIT_TOOL,
];
export const VCS_TOOL_LABELS: Record<string, string> = {
  [VCS_LOG_TOOL]: "VCS log",
  [VCS_FILE_DIFF_TOOL]: "VCS diff",
  [VCS_FILE_HISTORY_TOOL]: "VCS file history",
  [VCS_FILE_HISTORY_SHOW_TOOL]: "VCS file at revision",
  [VCS_CONFLICTS_TOOL]: "VCS conflicts",
  [VCS_OPLOG_TOOL]: "VCS operation log",
  [VCS_DESCRIBE_TOOL]: "VCS describe",
  [VCS_FILE_SPLIT_TOOL]: "VCS file split",
  [VCS_HUNK_LIST_TOOL]: "VCS hunk list",
  [VCS_HUNK_SPLIT_TOOL]: "VCS hunk split",
};

/**
 * How a change with nothing written on it is shown, in every row and every
 * answer — the placeholder adwaita's `sanitizeDescription` fills a blank with.
 */
export const NO_DESCRIPTION = "(no description)";

/**
 * Whether a change has nothing to read: the placeholder, or a blank first line.
 * A row that says this is drawn quiet, like an immutable one is.
 */
export function hasNoDescription(description: string): boolean {
  const line = (description.split("\n")[0] ?? "").trim();
  return line.length === 0 || line === NO_DESCRIPTION;
}

/** A change id is shown short in the log and in every instruction. */
export const SHORT_CHANGE_ID = 8;

/** An operation id is shown short the same way, in the op log panel and its toasts. */
export const SHORT_OP_ID = 8;

/** How many rows a panel draws before it stops counting what it left out. */
export const PANEL_LIST_CAP = 200;

/** How many file rows the right half of a vcs panel keeps above its preview. */
export const PANEL_FILE_ROWS = 6;

/** How many operations the op log panel reads; jj's whole history is nobody's list. */
export const OPLOG_PANEL_ROWS = 200;

/**
 * How much of an operation's time a row prints.
 *
 * jj prints it as a range of two stamps — opened, closed — and the row shows the
 * opening one, `2024-05-14 09:12`, which is also the shape the change stack's
 * rows print and what `relativeAge` reads.
 */
export const OPLOG_TIME_CHARS = 16;

/**
 * How many operations keep their patch in memory.
 *
 * An operation is immutable, so a patch that has been read is never re-read —
 * but the whole history of a busy repo does not fit, so the panel drops them all
 * rather than managing an eviction order for a preview.
 */
export const OP_PATCH_CACHE = 32;

/** How a vcs badge is painted: the two roles of a split and the copy a call resolved. */
export const VCS_BADGE_VARIANTS: Readonly<Record<string, BadgeVariant>> = {
  selected: "default",
  after: "default",
  before: "secondary",
  remaining: "secondary",
  "working copy": "warning",
  placement: "secondary",
};
