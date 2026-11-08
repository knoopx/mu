/**
 * Turns a plot answer into what the transcript draws.
 *
 * A plot call answers two audiences: `content` text for the model, and the data
 * of the plot in `details` for the log. This file folds the details into one view
 * — the chips of what was plotted, the shape of a refusal, and the points to
 * paint — so the component never parses an answer and never re-reads a number.
 */

import { counted } from "../../core/lib/agent/toolText";
import type { ToolRowCell } from "../../core/lib/ui/toolRowPaint";
import { CHART_RENDER_TOOL } from "../constants";
import type { ChartFigure, FigureStatus, PlotBadValue, PlotPoint } from "../types";
import { plotFigure } from "./plot";

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

const stringOf = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const numberOf = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const flagOf = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

function figureOf(value: unknown): ChartFigure | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const status = stringOf(record["status"]);
  if (status !== "ok" && status !== "empty" && status !== "invalid") return null;

  const kind = stringOf(record["kind"]);
  const measure = record["measure"];

  return {
    status: status as FigureStatus,
    kind: kind === "line" ? "line" : "bar",
    tone:
      typeof record["tone"] === "string"
        ? (record["tone"] as ChartFigure["tone"])
        : null,
    height: numberOf(record["height"]),
    width: numberOf(record["width"]),
    grid: flagOf(record["grid"], false),
    markers: flagOf(record["markers"], true),
    fill: flagOf(record["fill"], false),
    labels: flagOf(record["labels"], true),
    dash: typeof record["dash"] === "number" ? record["dash"] : null,
    emphasis: typeof record["emphasis"] === "number" ? record["emphasis"] : null,
    unit: stringOf(record["unit"]),
    caption: stringOf(record["caption"]),
    series: Array.isArray(record["series"])
      ? record["series"].filter((name): name is string => typeof name === "string")
      : [],
    points: Array.isArray(record["points"])
      ? record["points"].map(pointOf).filter((point): point is PlotPoint => point !== null)
      : [],
    plotted: numberOf(record["plotted"]),
    omitted: numberOf(record["omitted"]),
    measure:
      typeof measure === "object" && measure !== null
        ? {
            min: numberOf((measure as Record<string, unknown>)["min"]),
            max: numberOf((measure as Record<string, unknown>)["max"]),
            total: numberOf((measure as Record<string, unknown>)["total"]),
            mean: numberOf((measure as Record<string, unknown>)["mean"]),
            peak: stringOf((measure as Record<string, unknown>)["peak"]),
            peakValue: numberOf((measure as Record<string, unknown>)["peakValue"]),
            first: stringOf((measure as Record<string, unknown>)["first"]),
            last: stringOf((measure as Record<string, unknown>)["last"]),
          }
      : null,
    bad: Array.isArray(record["bad"]) ? record["bad"].map(badOf) : [],
    error: stringOf(record["error"]),
  };
}

function pointOf(value: unknown): PlotPoint | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record["values"])) return null;
  return {
    label: stringOf(record["label"]),
    values: record["values"].map((entry) => numberOf(entry)),
  };
}

function badOf(value: unknown): PlotBadValue {
  if (typeof value !== "object" || value === null) {
    return { at: 0, label: "", value: "" };
  }
  const record = value as Record<string, unknown>;
  return {
    at: numberOf(record["at"]),
    label: stringOf(record["label"]),
    value: stringOf(record["value"]),
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

/** The axis a plot spans, in one chip. */
function axisCell(figure: ChartFigure): string {
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
    cells: [
      { label: "chart", value: status === "empty" ? "" : figure.kind },
      {
        label: "points",
        value:
          figure.status === "ok"
            ? counted(figure.plotted, "point")
            : "",
      },
      {
        label: "series",
        value: figure.series.length === 0 ? "" : figure.series.join(", "),
      },
      { label: "axis", value: status === "ok" ? axisCell(figure) : "" },
      { label: "range", value: status === "ok" ? rangeCell(figure) : "" },
      {
        label: "peak",
        value:
          figure.measure === null || figure.status !== "ok"
            ? ""
            : `${figure.measure.peak} ${plotFigure(figure.measure.peakValue)}`,
      },
      {
        label: "not plotted",
        value: figure.omitted === 0 ? "" : String(figure.omitted),
      },
      {
        // The plot draws no unit of its own, so the row has to say what a figure
        // is a count of.
        label: "unit",
        value: figure.status === "ok" ? figure.unit : "",
      },
    ],
  };
}
