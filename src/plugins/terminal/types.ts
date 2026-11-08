import type { CursorShape } from "@wterm/core";
import type { EventPayload } from "@gpuix/native";

/** How one run of cells reads: colour and the marks the command asked for.
 *
 * An absent `fg` or `bg` is not white or black — it is the screen's own ink or
 * fill, so a theme change repaints the parts of a terminal that never asked for
 * a colour. */
export interface TerminalCellStyle {
  fg?: string;
  bg?: string;
  bold?: boolean;
  dim?: boolean;
  underline?: boolean;
  strike?: boolean;
}

/** One run of cells drawn in one style, with the wide-glyph continuation cells
 *  and the padding at the end of the line already gone. */
export interface TerminalRun {
  text: string;
  style: TerminalCellStyle;
}

export type TerminalRow = TerminalRun[];

/** What the panel paints: the rows in view, and where the cursor stands in them. */
export interface TerminalView {
  rows: TerminalRow[];
  /** The cursor's row in `rows`, or -1 when it is hidden or scrolled away. */
  cursorRow: number;
  /** The cell column the cursor stands on, counted in cells, not characters. */
  cursorCol: number;
  cursorShape: CursorShape;
  /** Lines scrolled up from the bottom of the screen. */
  scroll: number;
  /** Lines of history above the viewport. */
  history: number;
  /** Whether the program has taken the alternate screen — a pager, an editor. */
  altScreen: boolean;
}

/** The grid's geometry: what a cell costs in pixels, and how many fit. */
export interface TerminalGrid {
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  fontSize: number;
}

export type TerminalState = "starting" | "running" | "exited" | "failed";

/** What the composer's terminal panel answers with. */
export interface TerminalPanelState {
  grid: TerminalGrid;
  view: TerminalView;
  state: TerminalState;
  /** Why it is not running, or what the shell said as it left. */
  note?: string;
  /** The status line: which shell, how big the grid is, how much history. */
  status: string;
  /** Every key the panel takes. True means the key went to the shell. */
  onKey(event: EventPayload): boolean;
}
