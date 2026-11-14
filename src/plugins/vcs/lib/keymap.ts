import {
  abandonChange,
  editChange,
  newChange,
  revertChange,
  squashChange,
} from "./repo";
import { navDirectionOf } from "./nav";
import {
  FILES_SHORTCUTS,
  OPLOG_FILE_SHORTCUTS,
  OPLOG_SHORTCUTS,
  STACK_SHORTCUTS,
  matchShortcut,
  type KeyMods,
  type Shortcut,
} from "./shortcuts";
import type { FilePanelFocus, NavDirection, VcsPanelKind } from "../types";

const STACK_ACTION_IDS = new Set([
  "pick",
  "new",
  "edit",
  "split",
  "squash",
  "revert",
  "drop",
  "describe",
  "select",
  "bookmark",
  "push",
  "revset",
]);

const FILES_ACTION_IDS = new Set([
  "open",
  "edit",
  "split",
  "split-hunk",
  "discard",
]);

/**
 * What the op log's left half runs. Restoring an operation rewinds the whole
 * workspace, so these three are the only writes the panel makes for itself: a
 * change's own writes are the changes panel's, and its describes and splits go
 * to the agent.
 */
const OPLOG_ACTION_IDS = new Set(["restore", "undo", "redo"]);

export const STACK_MUTATIONS: Record<
  string,
  (changeId: string) => Promise<string>
> = {
  new: newChange,
  edit: editChange,
  squash: squashChange,
  revert: revertChange,
  drop: abandonChange,
};

export const isBareKey = (mods: KeyMods): boolean =>
  mods.ctrl !== true && mods.alt !== true && mods.cmd !== true;

/** The two halves of each panel that has them, in one table: a key means what its panel says it means. */
const PANEL_KEY_SETS: Record<
  VcsPanelKind,
  Record<FilePanelFocus, readonly Shortcut[]>
> = {
  changes: { stack: STACK_SHORTCUTS, files: FILES_SHORTCUTS },
  oplog: { stack: OPLOG_SHORTCUTS, files: OPLOG_FILE_SHORTCUTS },
};

export function matchPanelKey(
  panel: VcsPanelKind,
  focus: FilePanelFocus,
  key: string,
  mods: KeyMods,
): string {
  return matchShortcut([...PANEL_KEY_SETS[panel][focus]], key, mods)?.id ?? "";
}

/** A panel's left half: a list of things, a cursor, and the actions its own key set opens. */
export interface ListKeys {
  rowCount: number;
  actionsOpen: boolean;
  canFocusFiles: boolean;

  nav: (direction: NavDirection) => void;
  focusFiles: () => void;
  first: () => void;
  last: () => void;
  run: (id: string) => boolean;
}

function runListKey(
  id: string,
  actions: ReadonlySet<string>,
  keys: ListKeys,
): boolean {
  const direction = navDirectionOf(id);
  if (direction !== null) {
    keys.nav(direction);
    return true;
  }
  if (id === "focus-right") {
    if (keys.canFocusFiles) keys.focusFiles();
    return true;
  }
  if (id === "home" && keys.rowCount > 0) {
    keys.first();
    return true;
  }
  if (id === "end" && keys.rowCount > 0) {
    keys.last();
    return true;
  }
  if (keys.actionsOpen && actions.has(id)) return keys.run(id);
  return false;
}

export function runStackKey(id: string, keys: ListKeys): boolean {
  return runListKey(id, STACK_ACTION_IDS, keys);
}

export function runOplogKey(id: string, keys: ListKeys): boolean {
  return runListKey(id, OPLOG_ACTION_IDS, keys);
}

export interface FileKeys {
  actionsOpen: boolean;

  nav: (direction: NavDirection) => void;
  focusStack: () => void;
  scroll: (down: boolean) => void;
  pick: () => boolean;
  run: (id: string) => boolean;
}

/** The right half of both panels: a file's own patch, and what can be done to it. */
export function runFileKey(id: string, keys: FileKeys): boolean {
  const direction = navDirectionOf(id);
  if (direction !== null) {
    keys.nav(direction);
    return true;
  }
  if (id === "focus-left") {
    keys.focusStack();
    return true;
  }
  if (id === "scroll-up") {
    keys.scroll(false);
    return true;
  }
  if (id === "scroll-down") {
    keys.scroll(true);
    return true;
  }
  if (id === "pick") return keys.pick();
  if (keys.actionsOpen && FILES_ACTION_IDS.has(id)) return keys.run(id);
  return false;
}
