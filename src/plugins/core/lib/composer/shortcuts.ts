import type { EventPayload } from "@gpuix/native";
import { hints, navShortcuts, type Shortcut } from "adwaita-gpuix/shortcuts";
import { getKeybindings } from "../../../../keybindings/manager";
import { keyEventOf } from "../../../../keys";
import type { ComposerTarget } from "./mode";

export type { Shortcut } from "adwaita-gpuix/shortcuts";

export const DELETE_SESSION_KEY = "composer.deleteSession";

export const AUTOCOMPLETE_KEY = "editor.autocomplete";

const PANEL_CHOOSE: Record<string, string> = {
  commands: "run",
  model: "use",
  thinking: "set",
  session: "resume",
  file: "insert",
  path: "use",
  changes: "open",
  tree: "jump",
  theme: "apply",
  accent: "apply",
  userMessageHistory: "use",
  guardrails: "arm",
};


export function panelShortcuts(panel: ComposerTarget | "commands"): Shortcut[] {
  const rows: Shortcut[] = [];
  rows.push(...navShortcuts({ select: "move" }));
  rows.push({ id: "choose", kbds: ["enter"], desc: PANEL_CHOOSE[panel] });
  rows.push({ id: "close", kbds: ["escape"], desc: "close" });
  return rows;
}

export function panelHints(panel: ComposerTarget | "commands"): Shortcut[] {
  return hints(panelShortcuts(panel));
}


export function pathCompletionShortcuts(): Shortcut[] {
  return [
    {
      id: "complete",
      kbds: [getKeybindings().get(AUTOCOMPLETE_KEY)],
      desc: "complete",
    },
    ...navShortcuts({ select: "move" }),
    // Enter commits the highlighted name like every other panel: the panel
    // closes on it and the draft is left holding the path. A completion is still
    // a choice and never a send, so the draft only reaches the conversation
    // once the suggestions are gone.
    { id: "choose", kbds: ["enter"], desc: "use" },
    { id: "close", kbds: ["escape"], desc: "close" },
  ];
}

export function pathCompletionHints(): Shortcut[] {
  return hints(pathCompletionShortcuts());
}

export function isDeleteSessionKey(event: EventPayload): boolean {
  if (event.isHeld === true) return false;
  const mods = event.modifiers;
  if (
    mods?.ctrl === true ||
    mods?.shift === true ||
    mods?.alt === true ||
    mods?.cmd === true
  )
    return false;
  return getKeybindings().matches(keyEventOf(event), DELETE_SESSION_KEY);
}

export function sessionPanelShortcuts(): Shortcut[] {
  return [
    ...navShortcuts({ select: "move" }),
    { id: "resume", kbds: ["enter"], desc: "resume" },
    {
      id: "delete",
      kbds: [getKeybindings().get(DELETE_SESSION_KEY)],
      desc: "delete",
    },
    { id: "close", kbds: ["escape"], desc: "close" },
  ];
}

export function sessionPanelHints(): Shortcut[] {
  return hints(sessionPanelShortcuts());
}

export const USER_MESSAGE_HISTORY_KEY = "composer.userMessageHistory";

export function userMessageHistoryShortcuts(): Shortcut[] {
  return [
    ...navShortcuts({ select: "move" }),
    {
      id: "older",
      kbds: [getKeybindings().get(USER_MESSAGE_HISTORY_KEY)],
      desc: "older",
    },
    { id: "use", kbds: ["enter"], desc: "use" },
    { id: "close", kbds: ["escape"], desc: "close" },
  ];
}

export function userMessageHistoryHints(): Shortcut[] {
  return hints(userMessageHistoryShortcuts());
}
