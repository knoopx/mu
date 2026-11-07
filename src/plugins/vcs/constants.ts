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

/**
 * The tools that mutate the repo. A write runs only on an instruction the user
 * asked for — from the changes panel's keys, or from what they typed.
 */
export const VCS_WRITE_TOOLS: readonly string[] = [
  VCS_DESCRIBE_TOOL,
  VCS_FILE_SPLIT_TOOL,
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

/** A change id is shown short in the log and in every instruction. */
export const SHORT_CHANGE_ID = 8;

/** How a vcs badge is painted: the two roles of a split and the copy a call resolved. */
export const VCS_BADGE_VARIANTS: Readonly<Record<string, BadgeVariant>> = {
  selected: "default",
  after: "default",
  before: "secondary",
  remaining: "secondary",
  "working copy": "warning",
  placement: "secondary",
};
