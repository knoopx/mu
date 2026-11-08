/**
 * What a plot call says back.
 *
 * A model cannot see the picture, so an answer is a reading of it: what was
 * plotted, what the axis runs between, what the points add up to, and the points
 * themselves as figures. That is what makes a wrong plot catchable without eyes —
 * a peak in the wrong month is a month that was plotted in the wrong order.
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
import { MAX_POINTS, MAX_READOUT_POINTS } from "../constants";
import type { ChartFigure, PlotPoint } from "../types";
import { plotFigure } from "./plot";

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
