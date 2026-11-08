/**
 * From cells to runs of text.
 *
 * The screen model answers one cell at a time; the screen is painted in runs,
 * because a line of a terminal is mostly one style across, and giving every cell
 * its own element would put thousands of them in a window that changes sixty
 * times a second. A run is therefore the longest stretch of a line whose cells
 * read the same, with the padding at the end of the line dropped — an empty cell
 * with no colour behind it is nothing to draw.
 *
 * The cursor is folded in here rather than drawn as a mark laid over the grid, so
 * it cannot drift a cell away from the character it is standing on: the cell under
 * it becomes its own run, wearing the cursor's colour as its fill.
 */
import type { CellData } from "@wterm/core";
import type {
  TerminalCellStyle,
  TerminalRow,
  TerminalRun,
  TerminalView,
} from "../types";
import { cellColor, type TerminalPalette } from "./palette";
import type { Screen } from "./screen";

/** The rendition bits the core reports in a cell's `flags`. */
const FLAG_BOLD = 0x01;
const FLAG_DIM = 0x02;
const FLAG_UNDERLINE = 0x08;
const FLAG_REVERSE = 0x20;
const FLAG_INVISIBLE = 0x40;
const FLAG_STRIKE = 0x80;

/** What one cell says about how it should read, with reverse video already
 *  swapped over and an invisible cell already emptied of its ink. */
function styleOf(cell: CellData, palette: TerminalPalette): TerminalCellStyle {
  const reverse = (cell.flags & FLAG_REVERSE) !== 0;
  const fg = cellColor(cell.fg, cell.fgRgb, palette);
  const bg = cellColor(cell.bg, cell.bgRgb, palette);
  const style: TerminalCellStyle = {
    fg: reverse ? bg : fg,
    bg: reverse ? fg : bg,
  };
  if ((cell.flags & FLAG_BOLD) !== 0) style.bold = true;
  if ((cell.flags & FLAG_DIM) !== 0) style.dim = true;
  // Italic is asked for and dropped: the renderer sets a weight, not a face, and a
  // run painted in the wrong one would say something about the text that is not true.
  if ((cell.flags & FLAG_UNDERLINE) !== 0) style.underline = true;
  if ((cell.flags & FLAG_STRIKE) !== 0) style.strike = true;
  if ((cell.flags & FLAG_INVISIBLE) !== 0) style.fg = "transparent";
  return style;
}

function sameStyle(a: TerminalCellStyle, b: TerminalCellStyle): boolean {
  return (
    a.fg === b.fg &&
    a.bg === b.bg &&
    Boolean(a.bold) === Boolean(b.bold) &&
    Boolean(a.dim) === Boolean(b.dim) &&
    Boolean(a.underline) === Boolean(b.underline) &&
    Boolean(a.strike) === Boolean(b.strike)
  );
}

/** The glyph a cell holds. A grapheme cluster (an accent on a letter, a flag
 *  emoji) comes back in `chars`; a plain cell holds one code point. A wide glyph's
 *  second cell holds nothing and is skipped by the caller. */
function glyphOf(cell: CellData): string {
  const cluster = cell.chars;
  if (cluster !== undefined && cluster !== "") return cluster;
  if (cell.char === 0 || cell.char === 32) return " ";
  return String.fromCodePoint(cell.char);
}

const blank = (style: TerminalCellStyle): boolean =>
  style.bg === undefined && style.fg === undefined;

function rowOf(
  screen: Screen,
  line: number,
  cols: number,
  palette: TerminalPalette,
  cursorCell: number | undefined,
): TerminalRow {
  const runs: TerminalRun[] = [];
  let text = "";
  let style: TerminalCellStyle | undefined;

  const flush = (): void => {
    if (style === undefined || text === "") return;
    runs.push({ text, style });
    text = "";
    style = undefined;
  };

  for (let col = 0; col < cols; col += 1) {
    const cell = screen.cellAt(line, col);
    // A wide glyph is one cell that costs two columns; its continuation cell
    // carries no glyph and must not be drawn again.
    if (cell.width === 0 || cell.spacerHead === true) continue;
    let cellStyle = styleOf(cell, palette);
    if (cursorCell === col) cellStyle = cursorStyle(cellStyle, palette);
    const glyph = glyphOf(cell);
    if (style === undefined || !sameStyle(style, cellStyle)) {
      flush();
      style = cellStyle;
    }
    text += glyph;
  }

  // The last run of a line has no style change after it to close it, so the line
  // ends with an explicit flush or its only run is never drawn at all.
  flush();

  // The tail of a line only matters if it carries a colour: trailing spaces that
  // ask for nothing are what every empty cell says.
  while (runs.length > 0) {
    const last = runs[runs.length - 1] as TerminalRun;
    if (last.text.trimEnd() === "" && blank(last.style)) runs.pop();
    else if (last.text.trimEnd() === last.text) break;
    else {
      last.text = last.text.trimEnd();
      break;
    }
  }
  return runs;
}

/** The cell under the cursor: the cursor's colour becomes its fill, and what was
 *  behind the glyph becomes the glyph's ink. */
function cursorStyle(
  style: TerminalCellStyle,
  palette: TerminalPalette,
): TerminalCellStyle {
  return {
    ...style,
    fg: style.bg ?? palette.fill,
    bg: palette.cursor,
  };
}

/**
 * The window of the screen to paint.
 *
 * `scroll` is how far up from the bottom the window sits, so 0 is "following the
 * program" and anything larger is reading history. The cursor is only drawn when
 * it is inside the window: a cursor on a line that is not on screen is not a
 * cursor the reader can see.
 */
export function viewOf(
  screen: Screen,
  cols: number,
  rows: number,
  scroll: number,
  palette: TerminalPalette,
): TerminalView {
  const history = screen.history();
  const retained = screen.retained();
  const bottom = Math.max(0, retained - 1 - scroll);
  const top = Math.max(0, bottom - rows + 1);
  const cursor = screen.cursor();
  const cursorLine = history + cursor.row;

  const cursorRow =
    scroll === 0 && cursor.visible ? cursorLine - top : -1;
  const view: TerminalView = {
    rows: [],
    cursorRow,
    cursorCol: cursor.col,
    cursorShape: cursor.shape ?? "block",
    scroll,
    history,
    altScreen: screen.modes().altScreen,
  };

  for (let line = top; line <= bottom; line += 1) {
    const index = line - top;
    const cursorCell =
      cursorRow === index && cursor.col < cols ? cursor.col : undefined;
    view.rows.push(rowOf(screen, line, cols, palette, cursorCell));
  }
  return view;
}
