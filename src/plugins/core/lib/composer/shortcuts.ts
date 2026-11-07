import type { EventPayload } from "@gpuix/native";
import { hints, navShortcuts, type Shortcut } from "adwaita-gpuix/shortcuts";
import { getKeybindings } from "../../../../keybindings/manager";
import { keyEventOf } from "../../../../keys";
import type { ComposerTarget } from "./mode";

export type { Shortcut } from "adwaita-gpuix/shortcuts";

export const DELETE_SESSION_KEY = "composer.deleteSession";

export const AUTOCOMPLETE_KEY = "editor.autocomplete";

const PANEL_LABEL: Record<string, string> = {
  commands: "commands",
  model: "models",
  thinking: "thinking",
  session: "sessions",
  file: "files",
  path: "paths",
  changes: "changes",
  tree: "history",
  theme: "theme",
  accent: "accent",
  userMessageHistory: "messages",
  guardrails: "guardrails",
};

const PANEL_OPEN_KEY: Record<string, string> = {
  commands: "composer.commands",
  model: "composer.models",
  thinking: "composer.thinking",
  session: "composer.sessions",
  file: "composer.files",
  changes: "composer.changes",
  tree: "composer.tree",
  theme: "composer.theme",
  accent: "composer.accent",
  userMessageHistory: "composer.userMessageHistory",
  guardrails: "composer.guardrails",
};

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
  const openKey = PANEL_OPEN_KEY[panel];
  const rows: Shortcut[] = [];
  if (openKey !== undefined)
    rows.push({
      id: "open",
      kbds: [getKeybindings().get(openKey)],
      desc: PANEL_LABEL[panel],
    });
  rows.push(...navShortcuts({ select: "move" }));
  rows.push({ id: "choose", kbds: ["enter"], desc: PANEL_CHOOSE[panel] });
  rows.push({ id: "close", kbds: ["escape"], desc: "close" });
  return rows;
}

export function panelHints(panel: ComposerTarget | "commands"): Shortcut[] {
  return hints(panelShortcuts(panel));
}

/**
 * The completion panel is opened by Tab, not by a hotkey, so its first hint is
 * the key that opened it: Tab completes the path being typed, and Tab again
 * takes the highlighted one.
 */
export function pathCompletionShortcuts(): Shortcut[] {
  return [
    {
      id: "complete",
      kbds: [getKeybindings().get(AUTOCOMPLETE_KEY)],
      desc: "complete",
    },
    ...navShortcuts({ select: "move" }),
    { id: "choose", kbds: ["enter"], desc: PANEL_CHOOSE.path },
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
