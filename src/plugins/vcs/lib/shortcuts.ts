import {
  NAV,
  PAGED_NAV,
  bindingMatches,
  hints,
  matchShortcut,
  navShortcuts,
  type KeyMods,
  type Shortcut,
} from "adwaita-gpuix/shortcuts";

export type { KeyMods, Shortcut };
export { hints, matchShortcut, PAGED_NAV };

const FOCUS_RIGHT: Shortcut = {
  id: "focus-right",
  kbds: ["tab"],
  desc: "files",
  hidden: true,
};
const FOCUS_LEFT: Shortcut = {
  id: "focus-left",
  kbds: ["tab"],
  desc: "stack",
  hidden: true,
};
/** An operation's files offer nothing to act on, so what the hint line has left to say is the way back. */
const FOCUS_OPS: Shortcut = {
  id: "focus-left",
  kbds: ["tab"],
  desc: "operations",
};

/**
 * The two keys that move a file pane's own scroll, and the two that open the
 * file under the cursor.
 *
 * `shift+PageUp/Down` because plain Page Up belongs to whatever pager is reading,
 * and `o`/`e` because one letter means one program wherever a file row is under
 * the cursor — the changes panel's files and the op log's are the same rows.
 */
const SCROLL_KEYS: Shortcut[] = [
  {
    id: "scroll-up",
    kbds: [["shift", "pageup"]],
    desc: "scroll",
    hidden: true,
  },
  {
    id: "scroll-down",
    kbds: [["shift", "pagedown"]],
    desc: "scroll",
    hidden: true,
  },
];

const OPEN_KEYS: Shortcut[] = [
  { id: "open", kbds: ["o"], desc: "open" },
  { id: "edit", kbds: ["e"], desc: "edit" },
];

export const STACK_SHORTCUTS: Shortcut[] = [
  ...PAGED_NAV,
  FOCUS_RIGHT,
  { id: "pick", kbds: ["enter"], desc: "insert" },
  { id: "new", kbds: ["n"], desc: "new" },
  { id: "edit", kbds: ["e"], desc: "edit" },
  { id: "split", kbds: ["s"], desc: "split" },
  { id: "squash", kbds: ["f"], desc: "squash" },
  { id: "revert", kbds: ["r"], desc: "revert" },
  { id: "drop", kbds: ["delete"], desc: "drop" },
  { id: "describe", kbds: ["d"], desc: "describe" },
  { id: "select", kbds: ["space"], desc: "select" },
  { id: "bookmark", kbds: ["b"], desc: "bookmark" },
  { id: "push", kbds: [["ctrl", "p"]], desc: "push" },
  { id: "revset", kbds: ["/"], desc: "revset", hidden: true },
];

export const FILES_SHORTCUTS: Shortcut[] = [
  ...PAGED_NAV,
  FOCUS_LEFT,
  { id: "pick", kbds: ["enter"], desc: "insert" },
  ...OPEN_KEYS,
  ...SCROLL_KEYS,
  { id: "split", kbds: ["s"], desc: "split" },
  { id: "split-hunk", kbds: ["h"], desc: "split hunks" },
  { id: "discard", kbds: ["d"], desc: "discard" },
];

/**
 * The op log's left half: an operation is read, and rewound to.
 *
 * `r` restores the operation under the cursor, `u` and `U` take jj's own undo
 * and redo — the same three the standalone changes app runs, because an
 * operation rewinds the whole workspace rather than one change.
 */
export const OPLOG_SHORTCUTS: Shortcut[] = [
  ...PAGED_NAV,
  FOCUS_RIGHT,
  { id: "restore", kbds: ["r"], desc: "restore" },
  { id: "undo", kbds: ["u"], desc: "undo" },
  { id: "redo", kbds: [["shift", "u"]], desc: "redo" },
];

/**
 * An operation's files are history: they are read and scrolled, never split.
 *
 * They are still the paths of the working copy, so the two open keys answer —
 * `o` to the desktop's default app, `e` to the editor — and a file the
 * operation moved out of the tree is refused as gone rather than opened.
 */
export const OPLOG_FILE_SHORTCUTS: Shortcut[] = [
  ...PAGED_NAV,
  FOCUS_OPS,
  ...OPEN_KEYS,
  ...SCROLL_KEYS,
];

export const STACK_HINTS = hints(STACK_SHORTCUTS);
export const FILES_HINTS = hints(FILES_SHORTCUTS);
export const OPLOG_HINTS = hints(OPLOG_SHORTCUTS);
export const OPLOG_FILE_HINTS = hints(OPLOG_FILE_SHORTCUTS);

export const PICKER_SHORTCUTS: Shortcut[] = [
  { id: "type", kbds: ["type"], desc: "filter", hidden: true },
  { id: "nav-up", kbds: ["up"], desc: "nav", hidden: true },
  { id: "nav-down", kbds: ["down"], desc: "nav", hidden: true },
  { id: "apply", kbds: ["enter"], desc: "apply" },
  { id: "cancel", kbds: ["escape"], desc: "cancel" },
];

/** A bookmark can be forgotten from its picker; a revset cannot. */
export const BOOKMARK_PICKER_SHORTCUTS: Shortcut[] = [
  ...PICKER_SHORTCUTS,
  { id: "forget", kbds: ["delete"], desc: "forget" },
];
