import type { EventPayload } from "@gpuix/native";
import type { NativeRenderer } from "@gpuix/react";
import { getKeybindings } from "../../../../keybindings/manager";
import { keyEventOf } from "../../../../keys";
import { handleListKey } from "../ui/listNav";
import { isCycleTarget, type ComposerEvent, type ComposerMode } from "./mode";
import { isDeleteSessionKey } from "./shortcuts";

const PASTE_KEY_ID = "composer.paste";
const CLEAR_KEY_ID = "composer.clear";

const COMPOSER_HOTKEYS: Array<{ id: string; event: ComposerEvent }> = [
  { id: "composer.commands", event: { type: "openCommands" } },
  { id: "composer.models", event: { type: "openPick", target: "model" } },
  { id: "composer.thinking", event: { type: "openPick", target: "thinking" } },
  { id: "composer.sessions", event: { type: "openPick", target: "session" } },
  { id: "composer.files", event: { type: "openPick", target: "file" } },
  {
    id: "composer.userMessageHistory",
    event: { type: "openPick", target: "userMessageHistory" },
  },
  { id: "composer.changes", event: { type: "openChanges" } },
  { id: "composer.tree", event: { type: "openPick", target: "tree" } },
  { id: "composer.theme", event: { type: "openPick", target: "theme" } },
  { id: "composer.accent", event: { type: "openPick", target: "accent" } },
];

function wideHotkeyId(mode: ComposerMode): string {
  return mode.kind === "pick" && mode.target === "tree"
    ? "composer.tree"
    : "composer.changes";
}

const NAV_KEYS = new Set([
  "up",
  "arrowup",
  "down",
  "arrowdown",
  "pgup",
  "pageup",
  "page_up",
  "pgdown",
  "pagedown",
  "page_down",
  "escape",
]);

const SUBMIT_KEYS = new Set(["enter"]);
const BOUNDARY_KEYS = new Set(["home", "end"]);

export interface ComposerKeyContext {
  mode: ComposerMode;
  panelOpen: boolean;
  wideOpen: boolean;
  isStreaming: boolean;
  value: string;
  count: number;
  maxVisible: number;

  send: (event: ComposerEvent) => void;
  pickActive: () => void;
  onDelete?: () => void;
  onClear?: () => void;
  onPaste?: () => void;
  onAbort: () => void;
  onHistory?: () => void;

  wideKey?: (event: EventPayload) => boolean;

  renderer: NativeRenderer;
  listOwnsFocus: () => boolean;
  fieldOwnsFocus: () => boolean;
}

export function panelOwner(mode: ComposerMode, panelOpen: boolean): string {
  if (!panelOpen) return "";
  if (mode.kind === "commands") return "commands";
  return mode.kind === "pick" ? mode.target : "";
}

export function ownsFocus(node: number | null, renderer: NativeRenderer): boolean {
  if (node === null) return false;
  if (typeof renderer.getFocusedElementId !== "function") return false;
  return (renderer.getFocusedElementId() ?? null) === node;
}

const lowerKey = (event: EventPayload): string =>
  (event.key ?? "").toLowerCase();

function isPasteKey(event: EventPayload): boolean {
  if (event.isHeld === true) return false;
  return getKeybindings().matches(keyEventOf(event), PASTE_KEY_ID);
}

function isClearKey(event: EventPayload): boolean {
  if (event.isHeld === true) return false;
  return getKeybindings().matches(keyEventOf(event), CLEAR_KEY_ID);
}

const hasTextSelection = (renderer: NativeRenderer): boolean =>
  (renderer.getSelectedText?.() ?? "").length > 0;

function isBare(event: EventPayload): boolean {
  const mods = event.modifiers;
  return mods?.ctrl !== true && mods?.alt !== true && mods?.cmd !== true;
}

function typedCharacter(event: EventPayload, key: string): string | undefined {
  if (key === "enter") return undefined;
  const chars = event.keyChar;
  if (chars === undefined || chars.length !== 1) return undefined;
  return chars === "\n" || chars === "\r" ? undefined : chars;
}

function composerHotkey(
  event: EventPayload,
  ctx: ComposerKeyContext,
  cycle: boolean,
): boolean {
  const keys = getKeybindings();
  const keyEvent = keyEventOf(event);
  const openHotkeyId = wideHotkeyId(ctx.mode);
  const candidates =
    ctx.wideOpen === true
      ? COMPOSER_HOTKEYS.filter((h) => h.id === openHotkeyId)
      : COMPOSER_HOTKEYS;
  const hotkey = candidates.find((h) => keys.matches(keyEvent, h.id));
  if (hotkey === undefined) return false;
  const target = hotkey.event.type === "openPick" ? hotkey.event.target : null;
  const openTarget = ctx.mode.kind === "pick" ? ctx.mode.target : null;
  if (isCycleTarget(target) && target === openTarget) {
    if (cycle === false) return false;
    ctx.send({ type: "openPick", target, cycle: true, count: ctx.count });
    return true;
  }
  ctx.send(ctx.wideOpen === true ? { type: "close" } : hotkey.event);
  return true;
}

function clearKey(event: EventPayload, ctx: ComposerKeyContext): boolean {
  if (ctx.onClear === undefined) return false;
  if (!isClearKey(event)) return false;
  if (ctx.mode.kind !== "draft") return false;
  if (ctx.isStreaming) return false;
  if (ctx.fieldOwnsFocus() && hasTextSelection(ctx.renderer)) return false;
  ctx.onClear();
  return true;
}

function escapeKey(event: EventPayload, ctx: ComposerKeyContext): boolean {
  if (lowerKey(event) !== "escape") return false;
  if (ctx.mode.kind !== "draft") {
    ctx.send({ type: "close" });
    return true;
  }
  if (ctx.isStreaming) {
    ctx.onAbort();
    return true;
  }
  if (ctx.value.trim().length === 0) {
    ctx.onHistory?.();
    return true;
  }
  return false;
}

function pasteKey(event: EventPayload, ctx: ComposerKeyContext): boolean {
  if (ctx.onPaste === undefined || ctx.mode.kind !== "draft") return false;
  if (!isPasteKey(event)) return false;
  ctx.onPaste();
  return true;
}

function panelListKeys(event: EventPayload, ctx: ComposerKeyContext): void {
  handleListKey(event, {
    onUp: () => ctx.send({ type: "move", delta: -1, count: ctx.count }),
    onDown: () => ctx.send({ type: "move", delta: 1, count: ctx.count }),
    onPageUp: () =>
      ctx.send({
        type: "page",
        delta: -1,
        pageSize: ctx.maxVisible,
        count: ctx.count,
      }),
    onPageDown: () =>
      ctx.send({
        type: "page",
        delta: 1,
        pageSize: ctx.maxVisible,
        count: ctx.count,
      }),
    onEnter: ctx.pickActive,
    onEscape: () => ctx.send({ type: "close" }),
  });
}

function panelNavKey(
  event: EventPayload,
  ctx: ComposerKeyContext,
  submit: boolean,
): boolean {
  if (!ctx.panelOpen || ctx.mode.kind === "draft") return false;
  const key = lowerKey(event);

  if (ctx.onDelete !== undefined && isDeleteSessionKey(event)) {
    ctx.onDelete();
    return true;
  }

  if (BOUNDARY_KEYS.has(key)) {
    if (ctx.count === 0) return false;
    ctx.send(
      key === "home"
        ? { type: "first", count: ctx.count }
        : { type: "last", count: ctx.count },
    );
    return true;
  }

  if (NAV_KEYS.has(key) === false && !(submit === true && SUBMIT_KEYS.has(key)))
    return false;
  panelListKeys(event, ctx);
  return true;
}

function handlePanelKey(
  event: EventPayload,
  ctx: ComposerKeyContext,
  submit: boolean,
): void {
  if (!ctx.panelOpen || ctx.mode.kind === "draft") return;
  const { mode } = ctx;
  const key = lowerKey(event);
  const bare = isBare(event);

  if (bare && key === "backspace") {
    ctx.send({ type: "setQuery", query: mode.query.slice(0, -1) });
    return;
  }

  const char = typedCharacter(event, key);
  if (bare && char !== undefined) {
    ctx.send({ type: "setQuery", query: mode.query + char });
    return;
  }

  panelNavKey(event, ctx, submit);
}

function composerKey(
  event: EventPayload,
  ctx: ComposerKeyContext,
  cycle: boolean,
): boolean {
  return (
    composerHotkey(event, ctx, cycle) ||
    escapeKey(event, ctx) ||
    clearKey(event, ctx)
  );
}

export function composerFieldKey(
  event: EventPayload,
  ctx: ComposerKeyContext,
): void {
  if (pasteKey(event, ctx)) return;
  if (clearKey(event, ctx)) return;
  if (composerKey(event, ctx, false)) return;
  if (ctx.panelOpen === true && ctx.wideOpen === true)
    handlePanelKey(event, ctx, true);
}

export function composerListKey(
  event: EventPayload,
  ctx: ComposerKeyContext,
): void {
  if (composerKey(event, ctx, false)) return;
  handlePanelKey(event, ctx, true);
}

export function composerGlobalKey(
  event: EventPayload,
  ctx: ComposerKeyContext,
): boolean {
  if (ctx.wideKey?.(event) === true) return true;
  if (pasteKey(event, ctx)) return true;
  if (composerKey(event, ctx, true)) return true;
  return (
    ctx.listOwnsFocus() === false &&
    panelNavKey(event, ctx, ctx.fieldOwnsFocus() === false)
  );
}
