/**
 * The terminal panel's half of the session.
 *
 * The session lives outside this hook's renders and outside the panel: it is made
 * once for the window, kept while the panel is closed, and thrown away when the
 * window is. What the hook adds is the frame — the grid the panel was given, the
 * screen painted for it, and the scroll position the reader is sitting at — and the
 * keys, which go to the shell rather than to a query.
 *
 * The grid is the part that has to be right. The panel's room is measured, turned
 * into cells, and handed to the pty, so the shell draws the screen the panel can
 * show, and a window resize reflows it instead of leaving a column of stale cells.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAdwaita } from "adwaita-gpuix";
import type { EventPayload } from "@gpuix/native";
import { keyEventOf } from "../../../keys";
import { getKeybindings } from "../../../keybindings/manager";
import { readClipboardText } from "../../core/lib/composer/clipboard";
import { composerPanelHeight } from "../../core/lib/composer/panelHeight";
import {
  SCROLL_PAGE_STEP,
  TERMINAL_KEY,
  TERMINAL_PASTE_KEY,
} from "../constants";
import { gridOf } from "../lib/geometry";
import { encodeKey, pasteOf } from "../lib/keys";
import { terminalPalette } from "../lib/palette";
import { startTerminal, terminalStatus, type TerminalSession } from "../lib/session";
import type { TerminalPanelState, TerminalView } from "../types";

const noScreen: TerminalView = {
  rows: [],
  cursorRow: -1,
  cursorCol: 0,
  cursorShape: "block",
  scroll: 0,
  history: 0,
  altScreen: false,
};

const pageKey = (key: string, down: boolean): boolean =>
  down
    ? key === "pagedown" || key === "pgdown" || key === "pgdn"
    : key === "pageup" || key === "pgup";

/** Scrolling the panel's history is the one thing the reader asks for that the
 *  shell also wants, so it takes the Shift chord every terminal keeps for itself:
 *  plain Page Up belongs to the pager that is running. */
const isHistoryKey = (event: EventPayload, down: boolean): boolean =>
  pageKey((event.key ?? "").toLowerCase(), down) &&
  event.modifiers?.shift === true;

const isPromptKey = (event: EventPayload): boolean =>
  (event.key ?? "").toLowerCase() === "end" &&
  event.modifiers?.shift === true;

export interface TerminalPanelOptions {
  cwd: string;
  /** The panel is painted only while it is open; the shell is kept regardless. */
  enabled: boolean;
  windowWidth: number | undefined;
  windowHeight: number | undefined;
}

export function useTerminalPanel(
  options: TerminalPanelOptions,
): TerminalPanelState {
  const t = useAdwaita();
  const { cwd, enabled, windowWidth, windowHeight } = options;
  const sessionRef = useRef<TerminalSession | undefined>(undefined);
  const stopRef = useRef<(() => void) | undefined>(undefined);
  const [, repaint] = useState(0);
  const [scroll, setScroll] = useState(0);

  const grid = gridOf(
    t,
    windowWidth,
    composerPanelHeight(windowHeight),
    t.control.statusBarHeight,
  );

  // The first open starts the shell and it is not started again: a panel that
  // closes is a panel that was put away, not a program that was asked to stop.
  // A shell that ended is the exception — the run it was holding is over, so the
  // next open starts a new one instead of painting a dead screen forever.
  useEffect(() => {
    if (enabled === false) return;
    const kept = sessionRef.current;
    if (kept !== undefined) {
      if (kept.state !== "exited" && kept.state !== "failed") return;
      kept.dispose();
      stopRef.current?.();
      stopRef.current = undefined;
      sessionRef.current = undefined;
    }
    const started = startTerminal({ cwd, cols: grid.cols, rows: grid.rows });
    sessionRef.current = started;
    stopRef.current = started.subscribe(() => repaint((n) => n + 1));
    // The grid the panel had when it first opened is the grid the shell starts
    // with; every later size goes through `resize`, which is what tells the
    // shell to redraw what it has already drawn.
  }, [enabled, cwd]);

  useEffect(() => {
    sessionRef.current?.resize(grid.cols, grid.rows);
  }, [grid.cols, grid.rows]);

  // Coming back to the panel shows where the shell is now, not where the reader
  // left it before putting the panel away.
  useEffect(() => {
    if (enabled === true) setScroll(0);
  }, [enabled]);

  useEffect(
    () => () => {
      stopRef.current?.();
      stopRef.current = undefined;
      sessionRef.current?.dispose();
      sessionRef.current = undefined;
    },
    [],
  );

  const onKey = useCallback((event: EventPayload): boolean => {
    const started = sessionRef.current;
    if (started === undefined) return false;
    const keys = getKeybindings();
    // The key that opened the panel is the way out, because Escape is the
    // shell's: an editor, a pager and a bare prompt all need it.
    if (keys.matches(keyEventOf(event), TERMINAL_KEY)) return false;
    if (keys.matches(keyEventOf(event), TERMINAL_PASTE_KEY)) {
      void readClipboardText().then((text) => {
        if (text === null || text === "") return;
        started.send(pasteOf(text, started.modes()));
      });
      return true;
    }
    if (isHistoryKey(event, false)) {
      setScroll((at) =>
        Math.min(started.history(), at + started.rows * SCROLL_PAGE_STEP),
      );
      return true;
    }
    if (isHistoryKey(event, true)) {
      setScroll((at) => Math.max(0, at - started.rows * SCROLL_PAGE_STEP));
      return true;
    }
    if (isPromptKey(event)) {
      setScroll(0);
      return true;
    }
    const bytes = encodeKey(event, started.modes());
    if (bytes === undefined) return false;
    started.send(bytes);
    return true;
  }, []);

  const started = sessionRef.current;
  const view =
    started === undefined
      ? noScreen
      : started.view(Math.min(scroll, started.history()), terminalPalette(t));
  const note = started?.note ?? "";

  return {
    grid,
    view,
    state: started?.state ?? "starting",
    ...(note === "" ? {} : { note }),
    status:
      started === undefined
        ? "starting a shell…"
        : terminalStatus(started, grid, Math.min(scroll, started.history())),
    onKey,
  };
}
