/**
 * A keystroke in mu, in the bytes a shell expects.
 *
 * The window says what key went down and what character it produced; the pty
 * wants an encoding that is decades old and still what every program on the other
 * end speaks. The two answers are joined here: control characters off the letter,
 * the cursor keys as a CSI or an SS3 depending on whether the program asked for
 * application mode, the function keys in the order the numbering has them, and the
 * modifiers folded into the CSI's parameter where xterm would fold them.
 *
 * Nothing here invents a sequence. A keystroke mu cannot name is dropped rather
 * than guessed at, because a wrong byte written to a shell is a character the
 * reader has to notice and delete.
 */
import type { EventPayload } from "@gpuix/native";
import type { ScreenModes } from "./screen";

/** Keys that carry no meaning of their own — a modifier going down is not a
 *  keystroke, and sending nothing for it is the whole of it. */
const MODIFIER_KEYS = new Set([
  "shift",
  "shiftleft",
  "shiftright",
  "ctrl",
  "control",
  "ctrlleft",
  "ctrlright",
  "alt",
  "altleft",
  "altright",
  "cmd",
  "meta",
  "super",
  "capslock",
  "unknown",
]);

const NAMES: Record<string, string> = {
  enter: "\r",
  return: "\r",
  numpadenter: "\r",
  tab: "\t",
  backspace: "\x7f",
  escape: "\x1b",
  delete: "\x1b[3~",
  insert: "\x1b[2~",
  pageup: "\x1b[5~",
  pgup: "\x1b[5~",
  pagedown: "\x1b[6~",
  pgdn: "\x1b[6~",
  pgdown: "\x1b[6~",
  home: "\x1b[H",
  end: "\x1b[F",
  space: " ",
};

/** The cursor keys and Home/End, in the two orders a program can ask for. */
const CURSOR_KEYS: Record<string, { normal: string; app: string }> = {
  up: { normal: "A", app: "OA" },
  down: { normal: "B", app: "OB" },
  right: { normal: "C", app: "OC" },
  left: { normal: "D", app: "OD" },
  home: { normal: "H", app: "OH" },
  end: { normal: "F", app: "OF" },
};

const ARROW_SPELLINGS: Record<string, string> = {
  up: "up",
  arrowup: "up",
  uparrow: "up",
  down: "down",
  arrowdown: "down",
  downarrow: "down",
  left: "left",
  arrowleft: "left",
  leftarrow: "left",
  right: "right",
  arrowright: "right",
  rightarrow: "right",
};

/** The function keys, in the order their numbering actually runs: the first four
 *  are SS3, the rest are CSI with their own number. */
const FUNCTION_KEYS: Record<string, string> = {
  f1: "\x1bOP",
  f2: "\x1bOQ",
  f3: "\x1bOR",
  f4: "\x1bOS",
  f5: "\x1b[15~",
  f6: "\x1b[17~",
  f7: "\x1b[18~",
  f8: "\x1b[19~",
  f9: "\x1b[20~",
  f10: "\x1b[21~",
  f11: "\x1b[23~",
  f12: "\x1b[24~",
};

/** `Ctrl` plus a key, as the control code it has always meant. The letters run
 *  from Ctrl+A at 0x01; the punctuation and digits are the rest of the block. */
const CONTROL_CODES: Record<string, string> = {
  "[": "\x1b",
  "\\": "\x1c",
  "]": "\x1d",
  "^": "\x1e",
  "-": "\x1f",
  _: "\x1f",
  "/": "\x1f",
  " ": "\x00",
  "2": "\x00",
  "3": "\x1b",
  "4": "\x1c",
  "5": "\x1d",
  "6": "\x1e",
  "7": "\x1f",
};

const CONTROL_CHAR = /[\u0000-\u001f\u007f]/;

/** xterm folds the modifiers into a cursor key as `CSI 1 ; n C`: shift is 2, and
 *  each of alt, ctrl and super adds its own weight to that number. */
function modifierCode(shift: boolean, alt: boolean, ctrl: boolean): number {
  return 1 + (shift ? 1 : 0) + (alt ? 2 : 0) + (ctrl ? 4 : 0);
}

function controlOf(key: string): string | undefined {
  if (key.length === 1) {
    const code = key.toUpperCase().charCodeAt(0);
    if (code >= 65 && code <= 90)
      return String.fromCharCode((code - 64) % 0x20);
    const mapped = CONTROL_CODES[key];
    if (mapped !== undefined) return mapped;
  }
  return undefined;
}

/**
 * The bytes for one keystroke, or nothing when mu's key cannot be named.
 *
 * A printable character comes from what the keyboard produced, not from the key's
 * name, so a dead key, a compose sequence and a non-Latin layout all arrive as the
 * character the reader typed.
 */
export function encodeKey(
  event: EventPayload,
  modes: ScreenModes,
): string | undefined {
  const raw = (event.key ?? "").toLowerCase();
  if (raw === "" || MODIFIER_KEYS.has(raw)) return undefined;

  const mods = event.modifiers;
  const shift = mods?.shift === true;
  const ctrl = mods?.ctrl === true;
  const alt = mods?.alt === true;
  const cmd = mods?.cmd === true;
  // A Super chord means the window manager asked for something; a terminal does
  // not take those, and sending the bare key would fire a chord nobody pressed.
  if (cmd === true) return undefined;

  const arrow = ARROW_SPELLINGS[raw];
  if (arrow !== undefined) {
    const pair = CURSOR_KEYS[arrow] as { normal: string; app: string };
    const base = modes.appCursor ? pair.app : pair.normal;
    if (shift || alt || ctrl)
      return `\x1b[1;${modifierCode(shift, alt, ctrl)}${base.slice(-1)}`;
    return `\x1b${base}`;
  }

  if (raw === "enter") return ctrl ? "\x04" : "\r";
  if (raw === "tab") return shift ? "\x1b[Z" : ctrl ? "\t" : "\t";
  if (raw === "backspace") return ctrl ? "\x08" : alt ? "\x1b\x7f" : "\x7f";

  const functionKey = FUNCTION_KEYS[raw];
  if (functionKey !== undefined) return functionKey;

  const named = NAMES[raw];
  if (named !== undefined) {
    if (raw === "home" || raw === "end") {
      const pair = CURSOR_KEYS[raw] as { normal: string; app: string };
      if (shift || alt || ctrl)
        return `\x1b[1;${modifierCode(shift, alt, ctrl)}${pair.normal.slice(-1)}`;
      return `\x1b${modes.appCursor ? pair.app : pair.normal}`;
    }
    if (ctrl) {
      const control = controlOf(raw);
      if (control !== undefined) return control;
    }
    return alt ? `\x1b${named}` : named;
  }

  if (ctrl) {
    const control = controlOf(raw);
    if (control !== undefined) return control;
    const fromChar = (event.keyChar ?? "").charAt(0);
    return fromChar === "" ? undefined : controlOf(fromChar);
  }

  const produced = event.keyChar ?? "";
  if (produced.length > 0 && !CONTROL_CHAR.test(produced))
    return alt ? `\x1b${produced}` : produced;
  if (raw.length === 1) return alt ? `\x1b${raw}` : raw;
  return undefined;
}

/**
 * Text handed to the shell in one piece.
 *
 * A program that asked for bracketed paste wants a paste told apart from typing —
 * otherwise a multi-line paste runs half of itself before the rest has arrived.
 * The mode is the program's own asking, so the wrapper is only put on when it is
 * set.
 */
export function pasteOf(text: string, modes: ScreenModes): string {
  if (modes.bracketedPaste) return `\x1b[200~${text}\x1b[201~`;
  return text.replace(/\r\n/g, "\r");
}
