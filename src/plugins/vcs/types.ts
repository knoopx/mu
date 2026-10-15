export interface Change {
  change_id: string;
  commit_id: string;
  description: string;
  author: string;
  timestamp: string;
  immutable: boolean;
  empty: boolean;
  has_conflicts: boolean;
  parents: string[];
}

export interface FileChange {
  status: "A" | "M" | "D";
  path: string;
  insertions: number;
  deletions: number;
}

export interface Bookmark {
  name: string;
  change_id: string;
  description: string;
  author: string;
  remote: string;
  reference: string;
}

export interface RevsetDef {
  label: string;
  revset: string;
}

export type FilePanelFocus = "stack" | "files";

export type PanelMode = "normal" | "move";

export type NavDirection = "up" | "down" | "pageUp" | "pageDown";
