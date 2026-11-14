import type { EventModifiers, EventPayload } from "@gpuix/native";

export type KeyId = string;
export interface ParsedKey {
  key: string;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  cmd: boolean;
}
export type KeyEvent = Pick<EventPayload, "key" | "keyChar"> &
  Partial<EventModifiers>;

const MODIFIER_TOKENS: Record<string, keyof Omit<ParsedKey, "key">> = {
  ctrl: "ctrl",
  shift: "shift",
  alt: "alt",
  cmd: "cmd",
};

export function parseKey(input: string): ParsedKey {
  const tokens = input.split("+");
  const key = (tokens.pop() ?? "").toLowerCase();
  if (key === "") throw new Error(`parseKey: empty key in "${input}"`);
  const parsed: ParsedKey = {
    key,
    shift: false,
    ctrl: false,
    alt: false,
    cmd: false,
  };
  for (const token of tokens) {
    const mod = MODIFIER_TOKENS[token.toLowerCase()];
    if (mod === undefined)
      throw new Error(`parseKey: unknown modifier "${token}"`);
    parsed[mod] = true;
  }
  return parsed;
}

export function keyEventOf(event: EventPayload): KeyEvent {
  const mods = event.modifiers;
  return {
    key: event.key,
    keyChar: event.keyChar,
    shift: mods?.shift === true,
    ctrl: mods?.ctrl === true,
    alt: mods?.alt === true,
    cmd: mods?.cmd === true,
  };
}

const CONTROL_CHAR = /[\u0000-\u001f\u007f]/;

function chordOf(event: KeyEvent): string {
  const key = (event.key ?? "").toLowerCase();
  if (key !== "" && !CONTROL_CHAR.test(key)) return key;
  const chars = event.keyChar ?? "";
  if (chars.length !== 1 || CONTROL_CHAR.test(chars)) return "";
  return chars.toLowerCase();
}

export function matchesKey(event: KeyEvent, id: KeyId): boolean {
  const k = chordOf(event);
  if (k === "") return false;
  const parsed = parseKey(id);
  if (k !== parsed.key) return false;
  return (
    Boolean(event.shift) === parsed.shift &&
    Boolean(event.ctrl) === parsed.ctrl &&
    Boolean(event.alt) === parsed.alt &&
    Boolean(event.cmd) === parsed.cmd
  );
}

const MODIFIER_ORDER: Array<keyof Omit<ParsedKey, "key">> = [
  "ctrl",
  "shift",
  "alt",
  "cmd",
];
const MODIFIER_LABELS: Record<keyof Omit<ParsedKey, "key">, string> = {
  ctrl: "Ctrl",
  shift: "Shift",
  alt: "Alt",
  cmd: "Super",
};
const KEY_LABELS: Record<string, string> = {
  enter: "Enter",
  escape: "Escape",
  tab: "Tab",
  space: "Space",
  backspace: "Backspace",
  delete: "Delete",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  pagedown: "PageDown",
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
};

/**
 * A binding as the keys it is made of: one code per key.
 *
 * A keybinding is written as one string — `ctrl+shift+enter` — while a hint cap is
 * one key, so a chord handed to the screen as it is written arrives as one wide cap
 * that reads out its own name instead of a row of keys, each wearing the mark it
 * has on a real keyboard. This is the one place that knows the spelling. A trailing
 * `+` is the plus key itself (`ctrl++`), the only place a plus is a key rather than
 * a divider.
 */
export function keyCodes(id: KeyId): string[] {
  const tokens = id.split("+");
  if (id.endsWith("+")) {
    tokens.pop();
    tokens.push("+");
  }
  return tokens
    .filter((token) => token !== "")
    .map((token) => token.toLowerCase());
}

export function keyHint(id: KeyId): string {
  const parsed = parseKey(id);
  const mods = MODIFIER_ORDER.filter((mod) => parsed[mod] === true).map(
    (mod) => MODIFIER_LABELS[mod],
  );
  const key =
    KEY_LABELS[parsed.key] ??
    (parsed.key.length === 1 ? parsed.key.toUpperCase() : parsed.key);
  return [...mods, key].join("+");
}
