/**
 * What a figure call says back — a plot, a tree, a table.
 *
 * A model cannot see what was drawn, so an answer is a reading of it: what was
 * plotted and what the points add up to; which nodes stand under which, as
 * indented text; the rows of a table as an aligned table, with what each column
 * of figures sums to. That is what makes a wrong drawing catchable without eyes —
 * a peak in the wrong month, a leaf that ended up one level too deep, a row
 * whose cells went into the wrong columns.
 *
 * A refusal names the cell it could not read, because data is fixable: the next
 * call can be right without re-deriving the whole series.
 */

import {
  blocks,
  counted,
  moreLine,
  partsLine,
  statusTable,
  tableOf,
} from "../../core/lib/agent/toolText";
import {
  MAX_NODES,
  MAX_POINTS,
  MAX_READOUT_POINTS,
  MAX_TABLE_ROWS,
  MAX_TREE_LINES,
} from "../constants";
import type {
  ChartFigure,
  PlotPoint,
  TableFigure,
  TreeFigure,
} from "../types";
import { plotFigure } from "./plot";
import {
  tableBadCounts,
  tableFigureLinesOf,
  tableRowsOf,
  treeLinesOf,
} from "./structure";

/** A unit, spaced for reading and skipped when the call named none. */
const withUnit = (value: string, unit: string): string =>
  unit === "" ? value : `${value} ${unit}`;

const figureOf = (value: number, unit: string): string =>
  withUnit(plotFigure(value), unit);

/** The two ends of the axis, which is how a model checks it plotted the right span. */
function axisOf(figure: ChartFigure): string {
  const measure = figure.measure;
  if (measure === null) return "";
  return measure.first === measure.last
    ? measure.first
    : `${measure.first} → ${measure.last}`;
}

/** The peak, in the words that make it checkable. */
function peakOf(figure: ChartFigure): string {
  const measure = figure.measure;
  if (measure === null || measure.peak === "") return "";
  return `${measure.peak} at ${figureOf(measure.peakValue, figure.unit)}`;
}

/**
 * One point as the reading writes it: its label, then one figure per series.
 *
 * Several series are slashed rather than spaced, because `wk1 12 4` reads as two
 * points and `wk1 12/4` reads as one point with two values in the order the
 * header named.
 */
function readoutOf(point: PlotPoint): string {
  const values = point.values.map((value) => plotFigure(value));
  const figures = values.length === 1 ? values[0] : values.join("/");
  return point.label === "" ? figures : `${point.label} ${figures}`;
}

/** The points themselves, bounded: the list is the plot's sentence. */
function readoutBlock(figure: ChartFigure): string {
  if (figure.plotted === 0) return "";

  const shown = figure.points.slice(0, MAX_READOUT_POINTS);
  const notRead = figure.plotted - shown.length;

  return [
    `${counted(figure.plotted, "point")} plotted: ${shown
      .map(readoutOf)
      .join(" · ")}`,
    moreLine(notRead, "point"),
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** What the cap cut, in the words a caller can act on. */
function capNote(figure: ChartFigure): string {
  if (figure.omitted <= 0) return "";
  return partsLine(
    `… ${String(figure.omitted)} more ${figure.omitted === 1 ? "point" : "points"} not plotted`,
    `a plot past ${String(MAX_POINTS)} points is a texture, not a picture — group the values or send the ones that matter`,
  );
}

/** A plot that drew: its measurements, then what it plotted. */
export function chartAnswerOf(figure: ChartFigure): string {
  const measure = figure.measure;

  const head = statusTable({
    chart: figure.kind,
    points: String(figure.plotted),
    ...(figure.series.length === 0
      ? {}
      : { series: figure.series.join(", ") }),
    ...(axisOf(figure) === "" ? {} : { axis: axisOf(figure) }),
    ...(measure === null
      ? {}
      : {
          range: `${figureOf(measure.min, figure.unit)} → ${figureOf(measure.max, figure.unit)}`,
          total: figureOf(measure.total, figure.unit),
          mean: figureOf(measure.mean, figure.unit),
        }),
    ...(peakOf(figure) === "" ? {} : { peak: peakOf(figure) }),
  });

  return blocks(head, readoutBlock(figure), capNote(figure));
}

const INVALID_HINT =
  "one number per value — a unit, a currency sign or a thousands separator goes in the label, not in the cell";

/** A value the call wrote that is not a number: where it sat, and what was in it. */
export function chartInvalidAnswer(figure: ChartFigure): string {
  const rows = figure.bad.slice(0, MAX_READOUT_POINTS).map((bad) => ({
    at: `point ${String(bad.at + 1)}`,
    label: bad.label === "" ? "(no label)" : bad.label,
    value: bad.value === "" ? "(empty)" : bad.value,
  }));

  return blocks(
    statusTable({
      chart: figure.kind,
      unreadable: counted(figure.bad.length, "value"),
    }),
    figure.bad.length === 0 ? "" : tableOf(rows),
    figure.error,
    INVALID_HINT,
    moreLine(figure.bad.length - rows.length, "value"),
  );
}

/** A call that named no points at all. */
export const chartEmptyAnswer = (figure: ChartFigure): string =>
  blocks(
    statusTable({ chart: figure.kind, points: "0" }),
    figure.error === "" ? "the plot has no points" : figure.error,
    INVALID_HINT,
  );

/* --------------------------------------------------------------- the tree */

const TREE_HINT =
  "a node names itself — `name`, or a bare string — and `children` holds what hangs under it";

/** What the node and depth caps cut, in the words that say what to narrow. */
function treeCapNote(figure: TreeFigure): string {
  if (figure.omitted <= 0) return "";
  return partsLine(
    `… ${counted(figure.omitted, "subtree")} not drawn`,
    `a tree past ${String(MAX_NODES)} nodes is a listing, not a shape — draw the part that carries the point`,
  );
}

/** The lines of a changeset's tree, so a drawing with moves in it is checkable. */
function treeMoveText(figure: TreeFigure): string {
  if (figure.added === 0 && figure.removed === 0) return "";
  return `+${String(figure.added)} −${String(figure.removed)}`;
}

/** A tree that drew: its shape in numbers, then the shape itself as text. */
export function treeAnswerOf(figure: TreeFigure): string {
  const moved = treeMoveText(figure);
  const head = statusTable({
    tree: counted(figure.drawn, "node"),
    folders: String(figure.folders),
    leaves: String(figure.leaves),
    depth: String(figure.depth),
    ...(moved === "" ? {} : { moved }),
    ...(figure.expanded.length === 0
      ? {}
      : { open: String(figure.expanded.length) }),
  });

  const read = treeLinesOf(figure, MAX_TREE_LINES);
  const body = [read.lines.join("\n"), moreLine(read.notRead, "node")]
    .filter((line) => line.trim() !== "")
    .join("\n");

  return blocks(head, body, treeCapNote(figure));
}

/** A node the call could not name: where it hangs, and what was written there. */
export function treeInvalidAnswer(figure: TreeFigure): string {
  const rows = figure.bad.slice(0, MAX_TREE_LINES).map((bad) => ({
    under: bad.under,
    held: bad.value === "" ? "(nothing)" : bad.value,
  }));

  return blocks(
    statusTable({ tree: "0", unnamed: counted(figure.bad.length, "node") }),
    rows.length === 0 ? "" : tableOf(rows),
    figure.error,
    TREE_HINT,
    moreLine(figure.bad.length - rows.length, "node"),
  );
}

/** A call that named no nodes at all. */
export const treeEmptyAnswer = (figure: TreeFigure): string =>
  blocks(
    statusTable({ tree: "0", nodes: "0" }),
    figure.error === "" ? "the tree has no named nodes" : figure.error,
    TREE_HINT,
  );

/* -------------------------------------------------------------- the table */

const TABLE_HINT =
  "a row has one cell per column: send `columns` with one name per column, or key each row object by its " +
  "column name — and a cell is text, a number or a yes/no, never a list or an object";

function tableCapNote(figure: TableFigure): string {
  if (figure.omitted <= 0) return "";
  return partsLine(
    `… ${counted(figure.omitted, "row")} not drawn`,
    "send the rows that carry the point, or group them and send the groups",
  );
}

/** A table that drew: the header, the rows as an aligned table, the columns that add up. */
export function tableAnswerOf(figure: TableFigure): string {
  const head = statusTable({
    table: counted(figure.drawn, "row"),
    columns: counted(figure.columns.length, "column"),
    ...(figure.rows.length === 0
      ? {}
      : { width: `${String(widestRowOf(figure))} chars` }),
  });

  const read = tableRowsOf(figure, MAX_TABLE_ROWS);
  const figures = tableFigureLinesOf(figure);

  return blocks(
    head,
    read.rows.length === 0 ? "" : tableOf(read.rows),
    figures.length === 0 ? "" : partsLine(...figures),
    tableCapNote(figure),
    moreLine(read.notRead, "row"),
  );
}

/** How wide the widest row prints, which is what tells a caller to cut a column. */
function widestRowOf(figure: TableFigure): number {
  return figure.rows.reduce(
    (wide, row) =>
      Math.max(wide, row.reduce((sum, cell) => sum + cell.length + 3, 0)),
    0,
  );
}

/** A row that did not fit its header: which row, which cell, and what was in it. */
export function tableInvalidAnswer(figure: TableFigure): string {
  const rows = figure.bad.slice(0, MAX_TABLE_ROWS).map((bad) => ({
    row: `row ${String(bad.at + 1)}`,
    where: bad.column,
    held: bad.value === "" ? "(nothing)" : bad.value,
  }));

  const kinds = tableBadCounts(figure.bad);

  return blocks(
    statusTable({
      table: "0 rows",
      columns: counted(figure.columns.length, "column"),
      ...(kinds.overflow === 0 ? {} : { overflow: counted(kinds.overflow, "cell") }),
      ...(kinds.unreadable === 0 ? {} : { "not text": counted(kinds.unreadable, "cell") }),
    }),
    rows.length === 0 ? "" : tableOf(rows),
    figure.error,
    TABLE_HINT,
    moreLine(figure.bad.length - rows.length, "cell"),
  );
}

/** A call that named no rows at all. */
export const tableEmptyAnswer = (figure: TableFigure): string =>
  blocks(
    statusTable({
      table: "0 rows",
      columns: counted(figure.columns.length, "column"),
    }),
    figure.error === "" ? "the table has no rows" : figure.error,
    TABLE_HINT,
  );
