/**
 * The one plot contract.
 *
 * A plot is data plus a shape, and two callers ask for the same reading of it:
 * `chart-render`, whose points arrive as typed JSON, and a program's `Chart`,
 * whose points arrive as whatever the model wrote in source text. Both read
 * them here, so a chart in a program and a chart from a tool are the same
 * picture — same labels, same series ramp, same canvas — and cannot drift.
 *
 * What a caller does with an unreadable value is its own decision, which is the
 * one thing this file does not make: a tool refuses the call and names the cell,
 * because a model can fix data it is told is wrong; a drawer draws what it could
 * read, because a screen is already on the page and a drawer cannot answer back.
 *
 * Nothing here resolves a colour. A figure travels as data and is painted in the
 * theme the window is wearing at the moment it is drawn, so `plotColor` is handed
 * the theme at paint time, exactly as the diagram's markup is.
 */

import type {
  AdwaitaTheme,
  ChartData,
  ChartDataPoint,
  ChartSeriesPoint,
} from "adwaita-gpuix";

import { truncateToWidth } from "../../../utils/truncate";
import {
  CHART_CANVAS_WIDTH,
  CHART_HEIGHT,
  MAX_LABEL_CHARS,
  MAX_POINTS,
  MAX_SERIES,
  MAX_PLOT_HEIGHT,
  MIN_PLOT_HEIGHT,
} from "../constants";
import type {
  ChartFigure,
  ChartPlotParams,
  PlotBadValue,
  PlotKind,
  PlotMeasure,
  PlotPoint,
  PlotTone,
} from "../types";

/* ------------------------------------------------------------------ shape */

export const PLOT_KINDS: readonly string[] = ["bar", "line"];

const PLOT_TONES: readonly string[] = [
  "ink",
  "muted",
  "accent",
  "info",
  "success",
  "warning",
  "danger",
];

export const plotKindOf = (value: unknown): PlotKind =>
  typeof value === "string" && PLOT_KINDS.includes(value.trim().toLowerCase())
    ? (value.trim().toLowerCase() as PlotKind)
    : "bar";

/** A tone word, or nothing when the caller named no colour. */
export function plotToneOf(value: unknown): PlotTone | null {
  if (typeof value !== "string") return null;
  const word = value.trim().toLowerCase();
  return PLOT_TONES.includes(word) ? (word as PlotTone) : null;
}

/** A plot's own colour: the accent for a plot that named no tone. */
export function plotColor(t: AdwaitaTheme, tone: PlotTone | null): string {
  switch (tone ?? "accent") {
    case "ink":
      return t.color.text.primary;
    case "muted":
      return t.color.text.secondary;
    case "success":
      return t.color.functional.success;
    case "warning":
      return t.color.functional.warning;
    case "danger":
      return t.color.functional.destructive;
    default:
      return t.color.accent.base;
  }
}

/** The ramp the series of one plot are drawn from. */
export const seriesColors = (t: AdwaitaTheme): string[] => t.color.chart.series;

/**
 * What the series of a plot are called.
 *
 * A caller that named them gets its names; one that did not gets a name that is
 * at least true, because an unlabelled series is a colour the reader has to
 * guess at.
 */
export function seriesLabels(
  names: readonly string[],
  count: number,
): string[] {
  return Array.from({ length: count }, (_unused, at) => {
    const name = (names[at] ?? "").trim();
    return name === "" ? `series ${String(at + 1)}` : name;
  });
}

/* -------------------------------------------------------------- the cells */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A cell as the text the axis shows. */
export function cellText(value: unknown): string {
  if (typeof value === "string") return truncateToWidth(value.trim(), MAX_LABEL_CHARS);
  if (typeof value === "number" && Number.isFinite(value)) return plotFigure(value);
  if (typeof value === "boolean") return value ? "yes" : "no";
  return "";
}

/**
 * A cell as a number, or null when it is not one.
 *
 * `"12"` is a number a model meant; `"1,234"` and `"3 ms"` are not, and saying
 * so is what lets the call be fixed instead of drawn wrong.
 */
export function numberOf(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text === "") return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

/** A figure the way it was sent: no more decimals than it has. */
export function plotFigure(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.abs(value) < 1_000 ? Math.round(value * 100) / 100 : Math.round(value);
  return String(rounded);
}

export interface PlotCoercion {
  points: PlotPoint[];
  series: string[];
  bad: PlotBadValue[];
}

/** The series slots a single entry fills, and the names it wrote for them. */
function entryValues(
  entry: Record<string, unknown>,
  names: string[],
): unknown[] {
  const listed = entry.values;
  if (Array.isArray(listed)) {
    return listed.map((cell, at) => {
      if (isRecord(cell)) {
        const name = cellText(cell.name ?? cell.label);
        if (name !== "" && names[at] === undefined) names[at] = name;
        return cell.value;
      }
      return cell;
    });
  }
  const single = entry.value ?? entry.count ?? entry.amount ?? entry.y;
  return [single];
}

/**
 * Read the points a caller wrote.
 *
 * Three shapes are accepted, because two of them are what each caller naturally
 * writes: a list of cells (`["Mar", 412]`, and one value per series after the
 * label), an object (`{ label, value }` or `{ label, values: [{ name, value }] }`),
 * and a bare number, which is a value standing at its own index.
 */
export function coercePlot(entries: readonly unknown[]): PlotCoercion {
  const points: PlotPoint[] = [];
  const names: string[] = [];
  const bad: PlotBadValue[] = [];

  entries.forEach((entry, at) => {
    let label = "";
    let cells: unknown[];

    if (Array.isArray(entry)) {
      if (entry.length === 0) {
        bad.push({ at, label: "", value: "" });
        return;
      }
      const [head, ...rest] = entry;
      cells = rest.length === 0 ? [head] : rest;
      label = rest.length === 0 ? String(at + 1) : cellText(head);
    } else if (isRecord(entry)) {
      label = cellText(entry.label ?? entry.name ?? entry.file ?? entry.at);
      cells = entryValues(entry, names);
    } else {
      label = String(at + 1);
      cells = [entry];
    }

    const values: number[] = [];
    for (const [slot, cell] of cells.slice(0, MAX_SERIES).entries()) {
      const value = numberOf(cell);
      if (value === null) {
        bad.push({ at, label, value: cellText(cell) });
        return;
      }
      values[slot] = value;
    }

    points.push({
      label,
      values: Array.from({ length: values.length }, (_unused, slot) => values[slot] ?? 0),
    });
  });

  const width = points.reduce(
    (widest, point) => Math.max(widest, point.values.length),
    0,
  );
  const filled = points.map((point) => ({
    label: point.label,
    values: Array.from({ length: width }, (_unused, slot) => point.values[slot] ?? 0),
  }));

  return {
    points: filled,
    series: seriesLabels(names, Math.max(width - 1, 0)),
    bad,
  };
}

/* -------------------------------------------------------------- the plot */

/** What a set of plotted points adds up to. */
export function measureOf(points: readonly PlotPoint[]): PlotMeasure | null {
  if (points.length === 0) return null;

  const totals = points.map((point) =>
    point.values.reduce((sum, value) => sum + value, 0),
  );
  const values = points.flatMap((point) => point.values);
  const total = totals.reduce((sum, value) => sum + value, 0);
  const peak = totals.indexOf(Math.max(...totals));

  return {
    min: Math.min(...values),
    max: Math.max(...values),
    total,
    mean: total / values.length,
    peak: points[peak]?.label ?? "",
    peakValue: totals[peak] ?? 0,
    first: points[0]?.label ?? "",
    last: points[points.length - 1]?.label ?? "",
  };
}

/**
 * What the series of a plot are called.
 *
 * The names the caller gave, or the names its own data wrote, or — for a plot
 * that named nothing — what they are. A plot with one value per point has no
 * series to name, and naming one would only buy a legend of one.
 */
export function seriesNamesOf(
  given: readonly string[],
  read: PlotCoercion,
): string[] {
  const width = read.points[0]?.values.length ?? 0;
  if (width <= 1) return [];
  const named = given.filter((name) => name !== "");
  return seriesLabels(named.length > 0 ? named : read.series, width);
}

export interface PlotCap {
  points: PlotPoint[];
  omitted: number;
}

/** A plot the log can read: the first `max` points, and the count of what fell off. */
export function capPlot(points: readonly PlotPoint[], max: number = MAX_POINTS): PlotCap {
  if (points.length <= max) return { points: [...points], omitted: 0 };
  return { points: points.slice(0, max), omitted: points.length - max };
}

const boundedNumber = (
  value: number | null | undefined,
  fallback: number,
  min: number,
  max: number,
): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;

/**
 * A plot, in one status vocabulary.
 *
 * A value that is not a number refuses the whole call rather than plotting the
 * rest: a chart with a silently-short bar is a chart that lies, and the answer
 * names the cell so the next call is right.
 */
export function chartPlotOf(params: ChartPlotParams): ChartFigure {
  const kind = plotKindOf(params.kind);
  const height = boundedNumber(params.height, CHART_HEIGHT, MIN_PLOT_HEIGHT, MAX_PLOT_HEIGHT);
  const width = boundedNumber(params.width, CHART_CANVAS_WIDTH, 120, 4_096);
  const named = (params.series ?? []).map((name) => cellText(name));

  const base = {
    kind,
    tone: plotToneOf(params.tone),
    height,
    width,
    grid: params.grid === true,
    markers: params.markers !== false,
    fill: params.fill === true,
    labels: params.labels !== false,
    dash:
      typeof params.dash === "number" && Number.isFinite(params.dash) && params.dash > 0
        ? params.dash
        : null,
    emphasis:
      typeof params.emphasis === "number" && Number.isFinite(params.emphasis)
        ? Math.max(0, Math.round(params.emphasis))
        : null,
    unit: (params.unit ?? "").trim(),
    caption: (params.caption ?? "").trim(),
  };

  if (params.points.length === 0) {
    return {
      ...base,
      status: "empty",
      series: [],
      points: [],
      plotted: 0,
      omitted: 0,
      measure: null,
      bad: [],
      error: "no points were given — send at least one [label, value] pair",
    };
  }

  const read = coercePlot(params.points);
  if (read.bad.length > 0) {
    return {
      ...base,
      status: "invalid",
      series: [],
      points: [],
      plotted: 0,
      omitted: 0,
      measure: null,
      bad: read.bad,
      error:
        read.bad.length === 1
          ? "one value is not a number — nothing was plotted"
          : `${String(read.bad.length)} values are not a number — nothing was plotted`,
    };
  }

  const capped = capPlot(read.points);
  return {
    ...base,
    status: "ok",
    series: seriesNamesOf(named, { ...read, points: capped.points }),
    points: capped.points,
    plotted: capped.points.length,
    omitted: capped.omitted,
    measure: measureOf(capped.points),
    bad: [],
    error: "",
  };
}

/* ----------------------------------------------------------- what drew */

/**
 * What adwaita draws from: one value per point, or a bundle of named series.
 *
 * A single-series plot stays a plain series, so it is drawn in the plot's own
 * colour rather than the first stop of the ramp — a lone bar chart is one
 * colour, not a legend of one.
 */
export function plotData(
  points: readonly PlotPoint[],
  series: readonly string[],
): ChartData {
  if (series.length === 0) {
    const single: ChartDataPoint[] = points.map((point) => ({
      label: point.label,
      value: point.values[0] ?? 0,
    }));
    return single;
  }
  const bundled: ChartSeriesPoint[] = points.map((point) => ({
    label: point.label,
    values: point.values.map((value, at) => ({
      name: series[at] ?? `series ${String(at + 1)}`,
      value,
    })),
  }));
  return bundled;
}

export const plotDataOf = (figure: ChartFigure): ChartData =>
  plotData(figure.points, figure.series);

/** The legend a multi-series plot stands on: a series with no name is a guess. */
export const seriesLegend = (
  series: readonly string[],
  t: AdwaitaTheme,
): Array<{ name: string; color: string }> =>
  series.map((name, at) => ({
    name,
    color: seriesColors(t)[at] ?? t.color.accent.base,
  }));

export const legendOf = (figure: ChartFigure, t: AdwaitaTheme) =>
  seriesLegend(figure.series, t);
