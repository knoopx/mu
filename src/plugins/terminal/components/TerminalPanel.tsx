/**
 * The grid, painted.
 *
 * A terminal row is one line of fixed-pitch text and that is the whole of its
 * layout: the runs of a line stand in a row and follow one another, so they land in
 * the same columns they occupy in the screen model without a single measured x
 * coordinate. Only two things are sized — the line's height, which is the cell the
 * grid was counted in, and the fill behind a run, which is the run's own text plus
 * nothing at all. A line longer than the pane is cut at the pane edge, exactly where
 * a terminal cuts it, and never folded onto a second row.
 *
 * The cursor is not a mark laid over the grid. It is the cell it stands on, drawn
 * the other way round, which is the only way it cannot drift a column away from the
 * character it is on.
 */
import type { JSX } from "react";
import { T, useAdwaita, type AdwaitaTheme } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";
import { mixHex } from "../../core/lib/ui/theme";
import { terminalPalette } from "../lib/palette";
import type {
  TerminalCellStyle,
  TerminalGrid,
  TerminalRow,
  TerminalView,
} from "../types";

/** How far a `dim` run moves off its colour and into what it stands on — the same
 *  step a command's own dim text takes elsewhere in the app. */
const DIM_TOWARD_FILL = 0.45;

function screenBox(t: AdwaitaTheme, fill: string): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
    borderRadius: t.radius.sm,
    backgroundColor: fill,
  };
}

function rowStyle(grid: TerminalGrid): StyleDesc {
  return {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    height: grid.cellHeight,
    flexShrink: 0,
    minWidth: 0,
    overflow: "hidden",
  };
}

function runStyle(
  grid: TerminalGrid,
  style: TerminalCellStyle,
  ink: string,
  fill: string,
  mono: string,
): { box: StyleDesc; text: Partial<StyleDesc> } {
  const fg = style.fg ?? ink;
  const box: StyleDesc = {
    display: "flex",
    flexDirection: "row",
    height: grid.cellHeight,
    flexShrink: 0,
    ...(style.bg === undefined ? {} : { backgroundColor: style.bg }),
  };
  const text: Partial<StyleDesc> = {
    fontFamily: mono,
    fontSize: grid.fontSize,
    lineHeight: grid.cellHeight,
    whiteSpace: "nowrap",
    color: style.dim ? mixHex(fg, style.bg ?? fill, DIM_TOWARD_FILL) : fg,
  };
  if (style.bold === true) text.fontWeight = "bold";
  if (style.underline === true) text.textDecoration = "underline";
  else if (style.strike === true) text.textDecoration = "line-through";
  return { box, text };
}

function Row({
  row,
  grid,
  ink,
  fill,
  mono,
}: {
  row: TerminalRow;
  grid: TerminalGrid;
  ink: string;
  fill: string;
  mono: string;
}): JSX.Element {
  // A line with nothing on it still costs a line: the grid keeps its rows whether
  // or not the program painted them, and a collapsed one would move everything
  // under it up a cell.
  if (row.length === 0)
    return (
      <div style={rowStyle(grid)}>
        <T
          color={ink}
          style={{
            fontFamily: mono,
            fontSize: grid.fontSize,
            lineHeight: grid.cellHeight,
            whiteSpace: "nowrap",
          }}
        >
          {" "}
        </T>
      </div>
    );
  return (
    <div style={rowStyle(grid)}>
      {row.map((run, index) => {
        const { box, text } = runStyle(grid, run.style, ink, fill, mono);
        return (
          <div key={index} style={box}>
            <T color={text.color} style={text}>
              {run.text}
            </T>
          </div>
        );
      })}
    </div>
  );
}

export interface TerminalPanelProps {
  view: TerminalView;
  grid: TerminalGrid;
  /** What to say when there is no screen to show — a shell that has not started,
   *  or one that has left. */
  note?: string;
}

export function TerminalPanel({
  view,
  grid,
  note,
}: TerminalPanelProps): JSX.Element {
  const t = useAdwaita();
  const palette = terminalPalette(t);
  return (
    <div style={screenBox(t, palette.fill)}>
      {view.rows.length === 0 ? (
        <T
          color={palette.ink}
          style={{
            fontFamily: t.type.fontFamilyMono,
            fontSize: grid.fontSize,
            lineHeight: grid.cellHeight,
            whiteSpace: "nowrap",
          }}
        >
          {note ?? ""}
        </T>
      ) : (
        view.rows.map((row, index) => (
          <Row
            key={index}
            row={row}
            grid={grid}
            ink={palette.ink}
            fill={palette.fill}
            mono={t.type.fontFamilyMono}
          />
        ))
      )}
    </div>
  );
}
