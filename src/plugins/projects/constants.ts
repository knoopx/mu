/** How many projects the panel keeps in view, newest worked-in first. */
export const PROJECT_ROWS_CAP = 60;

/** pi's own name for the folder it files sessions under, inside its agent dir. */
export const SESSIONS_DIR_NAME = "sessions";

/**
 * What points the panel at another session store.
 *
 * The same shape as guardrails' rule overrides: one variable, read by one
 * plugin, naming the folder its list is built from. A scene of the panel needs a
 * store it can hold still — the real one's ages move, so its PNG would be a
 * different picture every capture — and a user with more than one agent dir can
 * name the one this window should list.
 */
export const PROJECTS_STORE_ENV = "MU_PROJECTS_STORE";

/** What one session file is called, and how big the first line of it can be. */
export const SESSION_FILE_SUFFIX = ".jsonl";

export const SESSION_HEADER_BYTES = 4096;
