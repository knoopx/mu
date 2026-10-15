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
