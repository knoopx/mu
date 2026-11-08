import type { AskMode } from "../types";

export type ShortcutSource = "field" | "window";

/**
 * What the panel takes from the field rather than letting the text widget spend
 * it on itself — the arrows, space, escape. While the field has the keyboard a
 * plain press never reaches the window listener, so these arrive through it.
 */
const FIELD_OWNED_IDS = new Set(["up", "down", "toggle", "cancel", "back"]);

/**
 * One press reaches the panel twice: as the keyDown of the focused field, and as
 * the window key event. Only the field sees a press while it holds the keyboard,
 * and only the window sees one while something else does, so the two answers
 * partition the keys: the field keeps FIELD_OWNED_IDS while it has focus, the
 * panel takes everything else. Either way a press acts exactly once — a cursor
 * that moves one row per arrow key, a space that checks one box.
 */
export function claimShortcut(
  source: ShortcutSource,
  id: string,
  fieldFocused: boolean,
): boolean {
  if (source === "field") return FIELD_OWNED_IDS.has(id);
  return !fieldFocused || !FIELD_OWNED_IDS.has(id);
}

export interface AskShortcutContext {
  id: string;
  source: ShortcutSource;
  mode: AskMode;
  freeformOnly: boolean;
  rowCount: number;

  move: (delta: number) => void;
  jumpTo: (target: number) => void;
  activate: () => void;
  toggleActive: () => boolean;
  submitChecked: () => void;
  setMode: (mode: AskMode) => void;
  toggleComment: () => void;
  escape: () => void;
  cancel: () => void;
}

type AskShortcutHandler = (ctx: AskShortcutContext) => boolean;

/** The arrows belong to the list, and the list is only drawn while selecting. */
const listOnly = (ctx: AskShortcutContext): boolean =>
  ctx.mode === "select" && ctx.rowCount > 0;

const HANDLERS: Record<string, AskShortcutHandler> = {
  up: (ctx) => {
    if (!listOnly(ctx)) return false;
    ctx.move(-1);
    return true;
  },
  down: (ctx) => {
    if (!listOnly(ctx)) return false;
    ctx.move(1);
    return true;
  },
  home: (ctx) => {
    if (!listOnly(ctx)) return false;
    ctx.jumpTo(0);
    return true;
  },
  end: (ctx) => {
    if (!listOnly(ctx)) return false;
    ctx.jumpTo(ctx.rowCount - 1);
    return true;
  },
  accept: (ctx) => {
    if (ctx.source === "field") return false;
    ctx.activate();
    return true;
  },
  toggle: (ctx) => ctx.toggleActive(),
  submit: (ctx) => {
    if (ctx.mode !== "select") return false;
    ctx.submitChecked();
    return true;
  },
  freeform: (ctx) => {
    if (ctx.freeformOnly) return false;
    ctx.setMode("freeform");
    return true;
  },
  extra: (ctx) => {
    if (ctx.freeformOnly) return false;
    ctx.toggleComment();
    return true;
  },
  back: (ctx) => {
    if (ctx.freeformOnly) return false;
    ctx.setMode("select");
    return true;
  },
  cancel: (ctx) => {
    if (ctx.mode === "select") ctx.escape();
    else ctx.cancel();
    return true;
  },
};

export function runAskShortcut(ctx: AskShortcutContext): boolean {
  const handler = HANDLERS[ctx.id];
  if (handler === undefined) return false;
  return handler(ctx);
}
