/**
 * How big the grid is: how much a cell costs, and how many fit.
 *
 * A terminal is sized in cells and everything on it is laid out to that size, so
 * the two directions have to agree exactly — the grid the shell is told it has and
 * the grid the panel paints. The way to keep them agreeing is to never count
 * painted rows: the panel asks for a cell count from the room it was given, hands
 * that count to the pty, and then draws the cells it is handed back. A row that
 * runs past the pane edge is cut there, exactly as a terminal cuts it, and never
 * wraps the panel into a second line.
 *
 * The room is the composer's band with its own chrome taken out of it: the page
 * inset the window keeps, the padding the panel's box pads itself by, the breathing
 * above and below its slots, and the status line under the grid.
 */
import type { AdwaitaTheme } from "adwaita-gpuix";
import {
  panelGap,
  panelPageInset,
  panelPadY,
} from "../../core/lib/composer/chrome";
import { PAGE_INSET } from "../../core/lib/ui/transcriptLayout";
import { monoTextWidth } from "../../core/lib/ui/tokens";
import { CELL_FONT_SIZE, CELL_LEADING, MIN_COLS, MIN_ROWS } from "../constants";
import type { TerminalGrid } from "../types";

/** What one cell costs, in pixels, at the measure the grid is set at. */
function cellMetrics(t: AdwaitaTheme): {
  cellWidth: number;
  cellHeight: number;
  fontSize: number;
} {
  return {
    // The app's own mono advance, the one every column of monospace text is
    // measured with — not a number the terminal invents for itself.
    cellWidth: monoTextWidth(t, 1, CELL_FONT_SIZE),
    cellHeight: Math.round(CELL_FONT_SIZE * CELL_LEADING),
    fontSize: CELL_FONT_SIZE,
  };
}

/** The room a panel's grid has, with the panel's chrome taken out of it. */
function gridRoom(
  t: AdwaitaTheme,
  windowWidth: number | undefined,
  panelHeight: number,
  statusBarHeight: number,
): { width: number; height: number } {
  const width =
    (windowWidth === undefined || windowWidth <= 0 ? 1280 : windowWidth) -
    2 * PAGE_INSET -
    2 * panelPageInset(t);
  const height =
    panelHeight -
    2 * panelPadY(t) -
    panelGap(t) -
    statusBarHeight;
  return { width, height };
}

/** The grid that fits that room. Never smaller than a readable terminal: a
 *  program offered three lines will draw a broken one. */
export function gridOf(
  t: AdwaitaTheme,
  windowWidth: number | undefined,
  panelHeight: number,
  statusBarHeight: number,
): TerminalGrid {
  const { cellWidth, cellHeight, fontSize } = cellMetrics(t);
  const room = gridRoom(t, windowWidth, panelHeight, statusBarHeight);
  // One cell of slack across. The advance is the app's mono budget rather than a
  // measurement of this font, so a grid counted to the edge may be a column wider
  // than the pane — and a column that is wider is one that gets cut off at the
  // right, hiding characters the shell believes it drew. A column narrower than
  // the pane only shows as a sliver of the screen's own fill.
  return {
    cols: Math.max(MIN_COLS, Math.floor(room.width / cellWidth) - 1),
    rows: Math.max(MIN_ROWS, Math.floor(room.height / cellHeight)),
    cellWidth,
    cellHeight,
    fontSize,
  };
}
