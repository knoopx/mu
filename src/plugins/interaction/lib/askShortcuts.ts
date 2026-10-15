import type { KeyMods } from "adwaita-gpuix/shortcuts";
import type { AskMode } from "../types";


export type ShortcutSource = "field" | "window";


const FIELD_OWNED_IDS = new Set(["up", "down", "toggle", "cancel", "back"]);


const COMBO_IDS = new Set(["submit"]);

export const isCombo = (mods: KeyMods): boolean =>
  mods.ctrl === true || mods.alt === true || mods.cmd === true;


export function claimShortcut(
  source: ShortcutSource,
  id: string,
  mods: KeyMods,
  fieldFocused: boolean,
): boolean {
  if (source === "field") return FIELD_OWNED_IDS.has(id);
  return !fieldFocused || isCombo(mods) || COMBO_IDS.has(id);
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


const HANDLERS: Record<string, AskShortcutHandler> = {
  up: (ctx) => {
    ctx.move(-1);
    return true;
  },
  down: (ctx) => {
    ctx.move(1);
    return true;
  },
  home: (ctx) => {
    ctx.jumpTo(0);
    return true;
  },
  end: (ctx) => {
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
