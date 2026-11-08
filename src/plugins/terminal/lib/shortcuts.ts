/**
 * What the terminal's hint line says — and so, what keys the panel takes.
 *
 * A terminal keeps keys the rest of mu uses. Escape is how an editor is left, not
 * how a panel is closed, and Page Up is what a pager is moved with, not what a list
 * is walked with: the shell is reading the same keystrokes the app would rather
 * have. So the hint line says the way out is the same key that opened the panel, and
 * the panel's own moves — the scrollback, the paste — are the ones a terminal has
 * always kept for the terminal rather than the program: the Shift and Ctrl+Shift
 * chords.
 *
 * A binding reaches the hint line as the **codes** of its keys, never as the one
 * string it is written in: `"shift+pageup"` is one cap to the renderer and it
 * prints its own name, while `["shift", "pageup"]` is two caps and each wears the
 * mark that key has on a real keyboard. The marks are the whole point — a chord
 * spelled out is three words where three glyphs say the same thing, and the words
 * are what run off the end of a narrow window.
 */
import { hints, type Shortcut } from "adwaita-gpuix/shortcuts";
import { getKeybindings } from "../../../keybindings/manager";
import { TERMINAL_KEY, TERMINAL_PASTE_KEY } from "../constants";

function terminalShortcuts(): Shortcut[] {
  const keys = getKeybindings();
  return [
    { id: "close", kbds: [keys.chord(TERMINAL_KEY)], desc: "close" },
    {
      id: "history",
      kbds: [
        ["shift", "pageup"],
        ["shift", "pagedown"],
      ],
      desc: "history",
    },
    { id: "prompt", kbds: [["shift", "end"]], desc: "to the prompt" },
    { id: "paste", kbds: [keys.chord(TERMINAL_PASTE_KEY)], desc: "paste" },
    { id: "keys", kbds: ["escape"], desc: "go to the shell", hidden: true },
  ];
}

export function terminalHints(): Shortcut[] {
  return hints(terminalShortcuts());
}
