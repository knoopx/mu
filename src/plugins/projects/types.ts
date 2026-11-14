/** One folder mu has sessions in — a project the window can be moved to. */
export interface ProjectFolder {
  /** the working directory itself, not the folder pi filed its sessions under */
  path: string;

  name: string;

  /** how many sessions this folder has, which is how much history is waiting there */
  sessions: number;

  /** when the newest of them was last written to */
  lastUsedMs: number;
}

/** The projects panel's own state: what the session store says, and how the read went. */
export interface ProjectsPanelApi {
  projects: ProjectFolder[];

  loading: boolean;
  error: string | null;
}

/** Whether a window opened somewhere, and what to say about it either way. */
export type ProjectWindowResult =
  | { ok: true; cwd: string }
  | { ok: false; error: string };
