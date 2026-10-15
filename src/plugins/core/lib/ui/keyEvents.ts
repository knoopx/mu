import type { EventPayload } from "@gpuix/native";
import { canonicalKey, type KeyMods } from "adwaita-gpuix";

export function keyOf(event: EventPayload): string {
  return canonicalKey(event.key ?? "");
}

export function modsOf(event: EventPayload): KeyMods {
  return {
    ctrl: event.modifiers?.ctrl === true,
    shift: event.modifiers?.shift === true,
    alt: event.modifiers?.alt === true,
    cmd: event.modifiers?.cmd === true,
  };
}

export function keyArgsOf(event: EventPayload): {
  key: string;
  mods: KeyMods;
} {
  return { key: keyOf(event), mods: modsOf(event) };
}

export function bareKeyArgs(event: { key?: string }): {
  key: string;
  mods: KeyMods;
} {
  return { key: canonicalKey(event.key ?? ""), mods: {} };
}

function typedCharOf(event: EventPayload): string | undefined {
  const chars = event.keyChar;
  if (chars === undefined || chars.length !== 1) return undefined;
  return chars === "\n" || chars === "\r" ? undefined : chars;
}

export function digitOf(event: EventPayload): number | null {
  const char = typedCharOf(event);
  if (char === undefined || !/^[1-9]$/.test(char)) return null;
  return Number.parseInt(char, 10) - 1;
}
