/**
 * The session: one shell, one screen, one grid, kept outside React.
 *
 * The panel opens and closes; the shell does not. A build that was started in the
 * terminal keeps running while the reader writes a message, and coming back shows
 * the screen where it was left, because the pty and the screen model are held here
 * and the panel is only a paint of them. The session is created once per window and
 * disposed when the window goes.
 *
 * Output arrives faster than the screen can be repainted — a build log is thousands
 * of writes a second — so the bytes are parsed as they land and the repaint is
 * throttled to a frame. A terminal that repainted every chunk would spend the window
 * drawing and the shell would spend its time waiting.
 */
import type { TerminalGrid, TerminalState, TerminalView } from "../types";
import { REPAINT_GAP_MS } from "../constants";
import { viewOf } from "./paint";
import { type TerminalPalette } from "./palette";
import { openPty, type Pty } from "./pty";
import { loadScreen, type Screen, type ScreenModes } from "./screen";

export interface TerminalSession {
  readonly state: TerminalState;
  /** Why it is not running: what failed, or what the shell said leaving. */
  readonly note: string;
  /** What the shell is called, once there is one. */
  readonly shell: string;
  /** The title the program asked the terminal to wear, if any. */
  readonly title: string;
  /** The grid the shell was last told it has. */
  readonly cols: number;
  readonly rows: number;
  /** Everything the panel paints for one frame. */
  view(scroll: number, palette: TerminalPalette): TerminalView;
  modes(): ScreenModes;
  /** Keystrokes and pastes, as bytes for the shell. */
  send(text: string): void;
  /** Tell the shell its screen changed size, and the model with it. */
  resize(cols: number, rows: number): void;
  /** Every line kept above the viewport. */
  history(): number;
  subscribe(notify: () => void): () => void;
  dispose(): void;
}

interface TerminalStart {
  cwd: string;
  cols: number;
  rows: number;
  /** The theme colours are asked for at paint time, not baked into the model. */
  env?: Record<string, string>;
}

export function startTerminal(options: TerminalStart): TerminalSession {
  let state: TerminalState = "starting";
  let note = "";
  let shell = "";
  let title = "";
  let screen: Screen | undefined;
  let pty: Pty | undefined;
  let cols = options.cols;
  let rows = options.rows;
  let stopped = false;

  const listeners = new Set<() => void>();
  let pending: ReturnType<typeof setTimeout> | undefined;

  /** One repaint is allowed per frame budget, however many writes landed in it. */
  const dirty = (): void => {
    if (stopped || pending !== undefined) return;
    pending = setTimeout(() => {
      pending = undefined;
      for (const listener of listeners) listener();
    }, REPAINT_GAP_MS);
  };

  const fail = (why: string): void => {
    if (stopped) return;
    state = "failed";
    note = why;
    dirty();
  };

  const settle = (why?: string): void => {
    if (stopped) return;
    if (state === "failed") return;
    state = "exited";
    note = why ?? "the shell exited";
    dirty();
  };

  void loadScreen(cols, rows).then(
    (loaded) => {
      if (stopped) return;
      screen = loaded;
      const opened = openPty({
        cwd: options.cwd,
        cols,
        rows,
        onData: (bytes) => {
          screen?.feed(bytes);
          // A program that asked the terminal something has to be answered from
          // the same queue the bytes came off, or it sits waiting.
          for (let reply = screen?.answer(); reply; reply = screen?.answer())
            pty?.write(reply);
          screen?.bell();
          const asked = screen?.title();
          if (asked !== undefined && asked !== null) title = asked;
          dirty();
        },
        onExit: settle,
        env: options.env,
      });
      if (opened.pty === undefined) {
        screen.dispose();
        screen = undefined;
        fail(opened.failure);
        return;
      }
      pty = opened.pty;
      shell = pty.shell;
      state = "running";
      dirty();
    },
    () => fail("the terminal's parser could not be loaded"),
  );

  return {
    get state(): TerminalState {
      return state;
    },
    get note(): string {
      return note;
    },
    get shell(): string {
      return shell;
    },
    get title(): string {
      return title;
    },
    get cols(): number {
      return cols;
    },
    get rows(): number {
      return rows;
    },
    view(scroll: number, palette: TerminalPalette): TerminalView {
      if (screen === undefined)
        return {
          rows: [],
          cursorRow: -1,
          cursorCol: 0,
          cursorShape: "block",
          scroll: 0,
          history: 0,
          altScreen: false,
        };
      return viewOf(screen, screen.cols, screen.rows, scroll, palette);
    },
    modes(): ScreenModes {
      return (
        screen?.modes() ?? {
          appCursor: false,
          bracketedPaste: false,
          altScreen: false,
        }
      );
    },
    send(text: string): void {
      pty?.write(text);
    },
    resize(nextCols: number, nextRows: number): void {
      if (stopped || (nextCols === cols && nextRows === rows)) return;
      cols = nextCols;
      rows = nextRows;
      screen?.resize(nextCols, nextRows);
      pty?.resize(nextCols, nextRows);
      dirty();
    },
    history(): number {
      return screen?.history() ?? 0;
    },
    subscribe(notify: () => void): () => void {
      listeners.add(notify);
      return () => {
        listeners.delete(notify);
      };
    },
    dispose(): void {
      if (stopped) return;
      stopped = true;
      if (pending !== undefined) clearTimeout(pending);
      listeners.clear();
      pty?.dispose();
      screen?.dispose();
      pty = undefined;
      screen = undefined;
    },
  };
}

/** What the status line says about one frame of the terminal. */
export function terminalStatus(
  session: TerminalSession,
  grid: TerminalGrid,
  scroll: number,
): string {
  if (session.state === "failed") return session.note;
  if (session.state === "exited")
    return `${session.note} — press the key again for a new shell`;
  if (session.state === "starting") return "starting a shell…";
  const size = `${session.cols}×${session.rows}`;
  const where =
    session.rows === grid.rows ? "" : ` (the panel has room for ${grid.rows})`;
  const history =
    session.history() === 0
      ? ""
      : ` · ${session.history()} lines of history${scroll === 0 ? "" : `, up ${scroll}`}`;
  return [session.title || session.shell, size + where, history]
    .filter((part) => part !== "")
    .join(" · ");
}
