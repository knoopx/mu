import { NAV, hints, type Shortcut } from "adwaita-gpuix/shortcuts";
import { groupHints, type HintGroup } from "adwaita-gpuix";
import { COMMENT_TOGGLE_KEY } from "../constants";
import type { AskMode } from "../types";

const CONFIRM: string[][] = [["ctrl", "enter"]];

export const ASK_NAV_SHORTCUTS: Shortcut[] = [
  { id: "up", kbds: ["up"], desc: "move", hidden: true },
  { id: "down", kbds: ["down"], desc: "move", hidden: true },
  ...NAV.filter((s) => s.id === "home" || s.id === "end"),
];

export const ASK_SINGLE_SHORTCUTS: Shortcut[] = [
  ...ASK_NAV_SHORTCUTS,
  { id: "accept", kbds: ["enter"], desc: "select" },
  { id: "freeform", kbds: ["tab"], desc: "answer" },
  { id: "extra", kbds: [COMMENT_TOGGLE_KEY], desc: "note" },
  { id: "type", kbds: ["type"], desc: "filter", hidden: true },
  { id: "cancel", kbds: ["escape"], desc: "cancel" },
];

export const ASK_MULTI_SHORTCUTS: Shortcut[] = [
  ...ASK_NAV_SHORTCUTS,
  { id: "toggle", kbds: ["space"], desc: "check" },
  { id: "accept", kbds: ["enter"], desc: "submit" },
  { id: "submit", kbds: CONFIRM, desc: "submit", hidden: true },
  { id: "freeform", kbds: ["tab"], desc: "answer" },
  { id: "extra", kbds: [COMMENT_TOGGLE_KEY], desc: "note" },
  { id: "cancel", kbds: ["escape"], desc: "cancel" },
];

export const ASK_TEXT_SHORTCUTS: Shortcut[] = [
  { id: "submit", kbds: ["enter"], desc: "submit" },
  { id: "newline", kbds: [["shift", "enter"]], desc: "newline" },
  { id: "back", kbds: ["escape"], desc: "back" },
  { id: "cancel", kbds: [["shift", "escape"]], desc: "cancel" },
];


export const askShortcutSet = (mode: AskMode, allowMultiple: boolean): Shortcut[] =>
  mode === "select"
    ? allowMultiple
      ? ASK_MULTI_SHORTCUTS
      : ASK_SINGLE_SHORTCUTS
    : ASK_TEXT_SHORTCUTS;

export function askHintGroups(
  mode: AskMode,
  allowMultiple: boolean,
  backEnabled = true,
): HintGroup[] {
  const set = askShortcutSet(mode, allowMultiple);
  return groupHints(
    hints(set).filter((s) => (s.id === "back" ? backEnabled : true)),
  );
}
