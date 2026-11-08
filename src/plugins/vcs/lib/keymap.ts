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
  STACK_SHORTCUTS,
  matchShortcut,
  type KeyMods,
} from "./shortcuts";
import type { FilePanelFocus, NavDirection } from "../types";

export const STACK_ACTION_IDS = new Set([
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

export const FILES_ACTION_IDS = new Set([
  "open",
  "split-file",
  "split-hunk",
  "discard",
]);

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

export function matchPanelKey(
  focus: FilePanelFocus,
  key: string,
  mods: KeyMods,
): string {
  const set = focus === "stack" ? STACK_SHORTCUTS : FILES_SHORTCUTS;
  return matchShortcut(set, key, mods)?.id ?? "";
}

export interface StackKeys {
  rowCount: number;
  actionsOpen: boolean;
  canFocusFiles: boolean;

  nav: (direction: NavDirection) => void;
  focusFiles: () => void;
  first: () => void;
  last: () => void;
  run: (id: string) => boolean;
}

export function runStackKey(id: string, keys: StackKeys): boolean {
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
  if (keys.actionsOpen && STACK_ACTION_IDS.has(id)) return keys.run(id);
  return false;
}

export interface FileKeys {
  actionsOpen: boolean;

  nav: (direction: NavDirection) => void;
  focusStack: () => void;
  scroll: (down: boolean) => void;
  pick: () => boolean;
  run: (id: string) => boolean;
}

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
