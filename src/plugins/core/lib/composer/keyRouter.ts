import type { EventPayload } from "@gpuix/native";
import type { NativeRenderer } from "@gpuix/react";
import { getKeybindings } from "../../../../keybindings/manager";
import { keyEventOf } from "../../../../keys";
import { handleListKey } from "../ui/listNav";
import {
  isCompletionMode,
  isCycleTarget,
  isTerminalMode,
  type ComposerEvent,
  type ComposerMode,
  type PickIntent,
} from "./mode";
import { isDeleteRowKey, isEditRowKey, isOpenRowKey } from "./shortcuts";
import { HOST } from "../../../registry";
import { panelHotkeys, wideHotkeyOf } from "../plugin/surfaces";

const PASTE_KEY_ID = "composer.paste";
const CLEAR_KEY_ID = "composer.clear";
const AUTOCOMPLETE_KEY_ID = "editor.autocomplete";

/**
 * The chords that open a composer panel.
 *
 * One entry belongs to the window itself — the command palette, which is not a
 * panel and has no owner. Every other chord is a panel's, registered by the plugin
 * that owns the panel, so a plugin that takes a chord cannot collide with another
 * one and the keymap has one list of owners.
 */
const composerHotkeys = (): Array<{ id: string; event: ComposerEvent }> => [
  { id: "composer.commands", event: { type: "openCommands" } },
  ...panelHotkeys(HOST),
];

/**
 * The hotkey that opens the wide panel that is open.
 *
 * While a wide panel is open only its own hotkey is a candidate, so pressing it
 * again closes the panel instead of opening a second one. The fallback is the
 * change stack's chord, which is what the window shows when nothing wide is open.
 */
const DEFAULT_WIDE_HOTKEY = "composer.changes";

function wideHotkeyId(mode: ComposerMode): string {
  if (mode.kind !== "pick") return DEFAULT_WIDE_HOTKEY;
  return wideHotkeyOf(HOST, mode.target) ?? DEFAULT_WIDE_HOTKEY;
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

  /** Take the row under the cursor: Tab completes, Enter commits. */
  pickActive: (intent: PickIntent) => void;

  /** Tab in a draft: complete the path the draft is typing. */
  onComplete?: () => void;

  /** A keystroke in a panel whose query is the draft, so the draft follows it. */
  onDraft?: (text: string) => void;

  onDelete?: () => void;

  /** Hand the row under the cursor to the desktop's default app. */
  onOpen?: () => void;

  /** Hand the row under the cursor to the user's editor. */
  onEdit?: () => void;
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

export function ownsFocus(
  node: number | null,
  renderer: NativeRenderer,
): boolean {
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

function isAutocompleteKey(event: EventPayload): boolean {
  if (event.isHeld === true) return false;
  return getKeybindings().matches(keyEventOf(event), AUTOCOMPLETE_KEY_ID);
}

const hasTextSelection = (renderer: NativeRenderer): boolean =>
  (renderer.getSelectedText?.() ?? "").length > 0;

function isBare(event: EventPayload): boolean {
  const mods = event.modifiers;
  return mods?.ctrl !== true && mods?.alt !== true && mods?.cmd !== true;
}

function typedCharacter(event: EventPayload, key: string): string | undefined {
  if (key === "enter" || key === "tab") return undefined;
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
      ? composerHotkeys().filter((h) => h.id === openHotkeyId)
      : composerHotkeys();
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

/**
 * Tab completes a path: in a draft it opens the completion panel over the path
 * the draft ends with, and in that panel it takes the highlighted completion
 * and leaves the panel open, so a folder can be entered and the next Tab goes
 * deeper.
 *
 * `cycle` says which listener runs the key: the field and the panel each get
 * their own key event and the window listener sees the same press, so taking a
 * completion — which moves the draft — is left to the element that has focus.
 * Opening the panel is idempotent and runs everywhere.
 */
function completionKey(
  event: EventPayload,
  ctx: ComposerKeyContext,
  cycle: boolean,
): boolean {
  if (!isAutocompleteKey(event)) return false;
  if (ctx.panelOpen === true) {
    if (isCompletionMode(ctx.mode) === false || cycle === true) return false;
    ctx.pickActive("complete");
    return true;
  }
  if (ctx.mode.kind !== "draft" || ctx.onComplete === undefined) return false;
  ctx.onComplete();
  return true;
}

/**
 * What Enter does in a panel: it commits the highlighted row, and the panel
 * closes on it. That includes the completion panel — Enter takes the path the
 * draft is typing and dismisses the suggestions whether the row is a file or a
 * folder, and only Tab stays to complete the next segment. A panel is still a
 * choice and never a send, so Enter here cannot put the draft in the log. With
 * nothing to take Enter is inert; Escape closes the panel and leaves the draft,
 * and Enter there sends.
 */
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
    onEnter: () => ctx.pickActive("commit"),
    onEscape: () => ctx.send({ type: "close" }),
  });
}

/**
 * A row key that is a bare letter has to be taken before the letter is typed.
 *
 * The file panel is the only panel that hands letters — `o` to the default app,
 * `e` to the editor — so it is the only panel that loses them from its filter.
 */
function panelLetterKey(event: EventPayload, ctx: ComposerKeyContext): boolean {
  if (ctx.onOpen !== undefined && isOpenRowKey(event)) {
    ctx.onOpen();
    return true;
  }
  if (ctx.onEdit !== undefined && isEditRowKey(event)) {
    ctx.onEdit();
    return true;
  }
  return false;
}

function panelNavKey(
  event: EventPayload,
  ctx: ComposerKeyContext,
  submit: boolean,
): boolean {
  if (!ctx.panelOpen || ctx.mode.kind === "draft") return false;
  const key = lowerKey(event);

  if (ctx.onDelete !== undefined && isDeleteRowKey(event)) {
    ctx.onDelete();
    return true;
  }

  if (panelLetterKey(event, ctx)) return true;

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

  const setQuery = (query: string): void => {
    ctx.onDraft?.(query);
    ctx.send({ type: "setQuery", query });
  };

  // The open and edit keys are bare letters, so they are taken before the
  // keystroke that would otherwise narrow the filter. Only a panel that can
  // take a row hands an onOpen or an onEdit, so no other panel loses a letter
  // to a command.
  if (panelLetterKey(event, ctx)) return;

  if (bare && key === "backspace") {
    setQuery(mode.query.slice(0, -1));
    return;
  }

  const char = typedCharacter(event, key);
  if (bare && char !== undefined) {
    setQuery(mode.query + char);
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

/**
 * Whether the focused panel is allowed to see this key at all.
 *
 * A panel's keys reach the app twice — once through the element that has focus and
 * once through the window listener — and the wide panels answer them in the window
 * route, where the hotkey that opened the panel is the one key that closes it. The
 * terminal is the wide panel whose every other key belongs to a shell, so the
 * element route is shut for it entirely: an Escape taken there would close the panel
 * on the same keystroke that was handed to an editor as "leave insert mode".
 */
function elementTakesKeys(mode: ComposerMode): boolean {
  return isTerminalMode(mode) === false;
}

export function composerFieldKey(
  event: EventPayload,
  ctx: ComposerKeyContext,
): void {
  if (elementTakesKeys(ctx.mode) === false) return;
  if (completionKey(event, ctx, false)) return;
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
  if (elementTakesKeys(ctx.mode) === false) return;
  if (completionKey(event, ctx, false)) return;
  if (composerKey(event, ctx, false)) return;
  handlePanelKey(event, ctx, true);
}

export function composerGlobalKey(
  event: EventPayload,
  ctx: ComposerKeyContext,
): boolean {
  if (ctx.wideKey?.(event) === true) return true;
  if (pasteKey(event, ctx)) return true;
  if (completionKey(event, ctx, true)) return true;
  if (composerKey(event, ctx, true)) return true;
  return (
    ctx.listOwnsFocus() === false &&
    panelNavKey(event, ctx, ctx.fieldOwnsFocus() === false)
  );
}
