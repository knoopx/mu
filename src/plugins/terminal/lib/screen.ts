/**
 * The screen model: what the terminal's grammar means, held apart from how it
 * is painted.
 *
 * The parser is wterm's — a Zig VT engine compiled to a ~50 KB WASM binary and
 * shipped as a headless core with no renderer in it. That split is the whole
 * reason it is usable here: mu has no DOM, so every terminal on screen is one
 * the app draws itself, and what the library contributes is the part that is
 * genuinely hard to get right — the escape grammar, the scrollback, the alternate
 * screen, the modes a program asks for, wide glyphs and their continuation cells.
 *
 * The core answers in cells, addressed in one line of retained history: row 0 is
 * the oldest line still kept, the next `history` lines are the scrollback, and
 * what is left is the viewport. Callers read that way and never have to know
 * that the scrollback is addressed from the other end.
 */
import { WasmBridge } from "@wterm/core";
import type { CellData, CursorState } from "@wterm/core";
import { SCROLLBACK_LINES } from "../constants";

export interface ScreenModes {
  /** Cursor keys report `ESC O A` rather than `ESC [ A` — what an editor asks for. */
  appCursor: boolean;
  /** A paste arrives inside `ESC [ 200 ~ … ESC [ 201 ~` so a shell can tell it
   *  from typing and not run a half-typed line. */
  bracketedPaste: boolean;
  /** The program has taken the alternate screen: a pager, an editor, a TUI. */
  altScreen: boolean;
}

export interface Screen {
  get cols(): number;
  get rows(): number;
  /** Bytes as they came off the pty, in one go — the core keeps its own UTF-8
   *  state, so a sequence split across two reads still parses. */
  feed(bytes: Uint8Array): void;
  resize(cols: number, rows: number): void;
  /** The next reply the terminal owes a program — a device attributes query, a
   *  cursor position report. Null when nothing is waiting. A program that is
   *  never answered waits: vim stops starting, `tput` stops printing. */
  answer(): string | null;
  /** How many bells have rung since the last read. */
  bell(): number;
  /** A title the program asked for, or null when none was set. */
  title(): string | null;
  cursor(): CursorState;
  modes(): ScreenModes;
  /** Lines kept above the viewport. */
  history(): number;
  /** Everything kept: history plus the viewport. */
  retained(): number;
  /** One cell of the retained screen, oldest line first. */
  cellAt(line: number, col: number): CellData;
  dispose(): void;
}

export async function loadScreen(cols: number, rows: number): Promise<Screen> {
  // No URL: the binary is carried inside the package as base64, so it travels in
  // the compiled executable and no file has to be installed beside it.
  const core = await WasmBridge.load();
  core.init(cols, rows);
  core.setScrollbackLines(SCROLLBACK_LINES);

  return {
    get cols(): number {
      return core.getCols();
    },
    get rows(): number {
      return core.getRows();
    },
    feed(bytes: Uint8Array): void {
      core.writeRaw(bytes);
    },
    resize(nextCols: number, nextRows: number): void {
      if (nextCols === core.getCols() && nextRows === core.getRows()) return;
      core.resize(nextCols, nextRows);
    },
    answer(): string | null {
      return core.getResponse();
    },
    bell(): number {
      return core.getBellCount();
    },
    title(): string | null {
      return core.getTitle();
    },
    cursor(): CursorState {
      return core.getCursor();
    },
    modes(): ScreenModes {
      return {
        appCursor: core.cursorKeysApp(),
        bracketedPaste: core.bracketedPaste(),
        altScreen: core.usingAltScreen(),
      };
    },
    history(): number {
      return core.getScrollbackCount();
    },
    retained(): number {
      return core.getScrollbackCount() + core.getRows();
    },
    cellAt(line: number, col: number): CellData {
      const history = core.getScrollbackCount();
      // The scrollback is addressed newest-first, the viewport oldest-first; the
      // single line of addressing is kept here so nothing downstream has to
      // remember which end each one starts at.
      if (line < history)
        return core.getScrollbackCell(history - 1 - line, col);
      return core.getCell(line - history, col);
    },
    dispose(): void {
      // The bridge owns only WASM memory; dropping it is enough.
    },
  };
}
