/**
 * Turns a figure answer into what the transcript draws — the plot.
 *
 * A call answers two audiences: `content` text for the model, and the data of the
 * figure in `details` for the log. This file folds the details into one view — the
 * chips of what was drawn, the shape of a refusal, and the rows to paint — so the
 * component never parses an answer and never re-reads a number. The details of a
 * session resumed this week are JSON, not a live object, so every reader here
 * checks the shape rather than trusting it.
 */

import {
  detailsAs,
  detailFlag,
  detailList,
  detailNumber,
  detailOptionalNumber,
  detailStrings,
  detailText,
  detailWord,
} from "../../core/lib/agent/toolDetails";
import type { ToolRowCell } from "../../core/lib/ui/toolRowPaint";
import { CHART_RENDER_TOOL } from "../constants";
import type {
  ChartFigure,
  FigureStatus,
  PlotBadValue,
  PlotMeasure,
  PlotPoint,
} from "../types";
import { plotFigure, plotKindOf, plotToneOf } from "./plot";

export interface ChartToolView {
  status: FigureStatus;

  /** The plot, or the shape of the refusal. Never absent: the header reads it too. */
  figure: ChartFigure;

  cells: ToolRowCell[];

  /** The values a refusal could not read. */
  bad: PlotBadValue[];
}

const EMPTY: ChartFigure = {
  status: "empty",
  kind: "bar",
  tone: null,
  height: 0,
  width: 0,
  grid: false,
  markers: true,
  fill: false,
  labels: true,
  dash: null,
  emphasis: null,
  unit: "",
  caption: "",
  series: [],
  points: [],
  plotted: 0,
  omitted: 0,
  measure: null,
  bad: [],
  error: "",
};

/** The statuses a plot answer can carry; anything else is not a plot. */
const FIGURE_STATUSES = [
  "ok",
  "empty",
  "invalid",
] as const satisfies readonly FigureStatus[];

/** The axis a plot was measured across — the figures the answer reads back. */
function measureOf(value: unknown): PlotMeasure | null {
  const measure = detailsAs<PlotMeasure>(value);
  if (measure === null) return null;
  return {
    min: detailNumber(measure.min),
    max: detailNumber(measure.max),
    total: detailNumber(measure.total),
    mean: detailNumber(measure.mean),
    peak: detailText(measure.peak),
    peakValue: detailNumber(measure.peakValue),
    first: detailText(measure.first),
    last: detailText(measure.last),
  };
}

/**
 * The plot a call left in its details.
 *
 * The answer is read through `ChartFigure` — the interface the tool wrote — so a
 * field this reader names has to be a field that interface has; each value is
 * still read through a reader, because the details of a session resumed this
 * week are JSON rather than the object the call returned.
 */
function figureOf(value: unknown): ChartFigure | null {
  const answer = detailsAs<ChartFigure>(value);
  if (answer === null) return null;
  const status = detailWord(answer.status, FIGURE_STATUSES);
  if (status === null) return null;

  return {
    status,
    kind: plotKindOf(answer.kind),
    tone: plotToneOf(answer.tone),
    height: detailNumber(answer.height),
    width: detailNumber(answer.width),
    grid: detailFlag(answer.grid, false),
    markers: detailFlag(answer.markers, true),
    fill: detailFlag(answer.fill, false),
    labels: detailFlag(answer.labels, true),
    dash: detailOptionalNumber(answer.dash),
    emphasis: detailOptionalNumber(answer.emphasis),
    unit: detailText(answer.unit),
    caption: detailText(answer.caption),
    series: detailStrings(answer.series),
    points: detailList<unknown>(answer.points)
      .map(pointOf)
      .filter((point): point is PlotPoint => point !== null),
    plotted: detailNumber(answer.plotted),
    omitted: detailNumber(answer.omitted),
    measure: measureOf(answer.measure),
    bad: detailList<unknown>(answer.bad).map(badOf),
    error: detailText(answer.error),
  };
}

function pointOf(value: unknown): PlotPoint | null {
  const point = detailsAs<PlotPoint>(value);
  if (point === null || !Array.isArray(point.values)) return null;
  return {
    label: detailText(point.label),
    values: detailList<unknown>(point.values).map(detailNumber),
  };
}

function badOf(value: unknown): PlotBadValue {
  const bad = detailsAs<PlotBadValue>(value) ?? { at: 0, label: "", value: "" };
  return {
    at: detailNumber(bad.at),
    label: detailText(bad.label),
    value: detailText(bad.value),
  };
}

/** The line a refusal leaves behind: how many values, and the first of them. */
export function chartFailureLine(figure: ChartFigure): string {
  const first = figure.bad[0];
  if (first === undefined) return figure.error;
  const where = `point ${String(first.at + 1)}${first.label === "" ? "" : ` (“${first.label}”)`}`;
  const shown = first.value === "" ? "(empty)" : first.value;
  return figure.bad.length === 1
    ? `${figure.error}: ${where} holds ${shown}`
    : `${figure.error}: ${where} holds ${shown}, and ${String(figure.bad.length - 1)} more`;
}

/** The axis a plot spans, in one line: the header's, since only the header says it. */
export function axisCell(figure: ChartFigure): string {
  const measure = figure.measure;
  if (measure === null) return "";
  if (measure.first === measure.last) return measure.first;
  return `${measure.first} → ${measure.last}`;
}

function rangeCell(figure: ChartFigure): string {
  const measure = figure.measure;
  if (measure === null) return "";
  return `${plotFigure(measure.min)} → ${plotFigure(measure.max)}`;
}

export function chartToolViewOf(
  name: string,
  _args: Record<string, unknown> | undefined,
  details: unknown,
  itemStatus: string,
): ChartToolView | null {
  if (name.toLowerCase() !== CHART_RENDER_TOOL) return null;

  const figure = figureOf(details) ?? EMPTY;
  const status: FigureStatus =
    itemStatus === "error" && figure.status === "ok" ? "empty" : figure.status;

  return {
    status,
    figure,
    bad: figure.bad,
    // The header line already says the kind and the span, so neither is a chip;
    // and a chip whose value repeats its own label prints the word twice
    // (`points 9 points`), which is what the bare figure is for.
    cells: [
      {
        label: "points",
        value: figure.status === "ok" ? String(figure.plotted) : "",
      },
      {
        label: "series",
        value: figure.series.length === 0 ? "" : figure.series.join(", "),
      },
      { label: "range", value: status === "ok" ? rangeCell(figure) : "" },
      {
        label: "peak",
        value:
          figure.measure === null || figure.status !== "ok"
            ? ""
            : `${figure.measure.peak} ${plotFigure(figure.measure.peakValue)}`,
      },
      // What the plot left out is not a chip: a chip line clips at its end, and the
      // one figure that must not be lost is the one saying the plot is not the whole
      // story. It is named once, in the note under the plot, beside the remedy.
      {
        // The plot draws no unit of its own, so the row has to say what a figure
        // is a count of.
        label: "unit",
        value: figure.status === "ok" ? figure.unit : "",
      },
    ],
  };
}
