import type { EventPayload } from "@gpuix/native";
import { hints, navShortcuts, type Shortcut } from "adwaita-gpuix/shortcuts";
import { getKeybindings } from "../../../../keybindings/manager";
import { keyEventOf } from "../../../../keys";
import type { ComposerTarget } from "./mode";
import { HOST } from "../../../registry";
import {
  panelChooseWord,
  panelDeleteWord,
  panelEditWord,
  panelOpenWord,
} from "../plugin/surfaces";

export type { Shortcut } from "adwaita-gpuix/shortcuts";

export const DELETE_ROW_KEY = "composer.deleteRow";

export const OPEN_ROW_KEY = "composer.openRow";

export const EDIT_ROW_KEY = "composer.editRow";

export const AUTOCOMPLETE_KEY = "editor.autocomplete";

/**
 * What a panel's keys are called, in the panel's own words.
 *
 * The panel that owns a row type says what its keys do by registering the words
 * (`core/lib/plugin/manifest.ts`): what Enter takes, whether Delete has anything
 * to delete, and whether `o` and `e` have a file to hand off. A panel that names
 * no word does not take that key, and its hint line says so — a hint a panel does
 * not print is a key that panel does not take. The command palette is the one
 * list core owns and is not a panel, so its word is the one left here.
 */
const COMMANDS_CHOICE = "run";

const chooseWord = (panel: ComposerTarget | "commands"): string | undefined =>
  panel === "commands" ? COMMANDS_CHOICE : panelChooseWord(HOST, panel);

export const panelCanDelete = (panel: ComposerTarget | "commands"): boolean =>
  panelDeleteWord(HOST, panel) !== undefined;

export const panelCanOpen = (panel: ComposerTarget | "commands"): boolean =>
  panelOpenWord(HOST, panel) !== undefined;

export const panelCanEdit = (panel: ComposerTarget | "commands"): boolean =>
  panelEditWord(HOST, panel) !== undefined;

export function panelShortcuts(panel: ComposerTarget | "commands"): Shortcut[] {
  const rows: Shortcut[] = [];
  rows.push(...navShortcuts({ select: "move" }));
  // A panel that names no word for a key does not take it, and prints no chip for
  // it — the hint line is how a panel says what its keys do.
  const choose = chooseWord(panel);
  if (choose !== undefined)
    rows.push({ id: "choose", kbds: ["enter"], desc: choose });
  if (panelCanOpen(panel))
    rows.push({
      id: "open",
      kbds: [getKeybindings().get(OPEN_ROW_KEY)],
      desc: panelOpenWord(HOST, panel) ?? "open",
    });
  if (panelCanEdit(panel))
    rows.push({
      id: "edit",
      kbds: [getKeybindings().get(EDIT_ROW_KEY)],
      desc: panelEditWord(HOST, panel) ?? "edit",
    });
  if (panelCanDelete(panel))
    rows.push({
      id: "delete",
      kbds: [getKeybindings().chord(DELETE_ROW_KEY)],
      desc: panelDeleteWord(HOST, panel) ?? "delete",
    });
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
      kbds: [getKeybindings().chord(AUTOCOMPLETE_KEY)],
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

/**
 * Whether a keystroke is one key pressed on its own, with nothing held and no
 * repeat: a panel answers a row key once, and only the bare press.
 */
function isBareRowKey(event: EventPayload, id: string): boolean {
  if (event.isHeld === true) return false;
  const mods = event.modifiers;
  if (
    mods?.ctrl === true ||
    mods?.shift === true ||
    mods?.alt === true ||
    mods?.cmd === true
  )
    return false;
  return getKeybindings().matches(keyEventOf(event), id);
}

export const isDeleteRowKey = (event: EventPayload): boolean =>
  isBareRowKey(event, DELETE_ROW_KEY);

export const isOpenRowKey = (event: EventPayload): boolean =>
  isBareRowKey(event, OPEN_ROW_KEY);

export const isEditRowKey = (event: EventPayload): boolean =>
  isBareRowKey(event, EDIT_ROW_KEY);

export const USER_MESSAGE_HISTORY_KEY = "composer.userMessageHistory";

export function userMessageHistoryShortcuts(): Shortcut[] {
  return [
    ...navShortcuts({ select: "move" }),
    {
      id: "older",
      kbds: [getKeybindings().chord(USER_MESSAGE_HISTORY_KEY)],
      desc: "older",
    },
    { id: "use", kbds: ["enter"], desc: "use" },
    { id: "close", kbds: ["escape"], desc: "close" },
  ];
}

export function userMessageHistoryHints(): Shortcut[] {
  return hints(userMessageHistoryShortcuts());
}
