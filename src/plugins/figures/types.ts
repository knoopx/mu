/**
 * What a plot is, and what a plot call answers with.
 *
 * A figure travels in a tool result as *data*, never as a picture: the log draws
 * it in the colours the window is wearing at the moment it is drawn, and the same
 * row still reads correctly after a theme change or in a session resumed next
 * week. That is why `tone` is a word here and no hex ever is.
 */

/**
 * `ok` plotted what it was given; `empty` had no points to plot; `invalid` is a
 * value that is not a number, which is a thing the model can fix and re-send.
 */
export type FigureStatus = "ok" | "empty" | "invalid";

/** The two shapes a plot takes, in one list the schema, the reader and the view share. */
export const PLOT_KINDS = ["bar", "line"] as const;

export type PlotKind = (typeof PLOT_KINDS)[number];

/**
 * The colour words a plot takes, the same words a program's `tone` takes. The
 * list is the type: the tool's schema, the reader that validates a word the
 * caller wrote, and the view that paints it all answer from these seven.
 */
export const PLOT_TONES = [
  "accent",
  "ink",
  "muted",
  "info",
  "success",
  "warning",
  "danger",
] as const;

export type PlotTone = (typeof PLOT_TONES)[number];

/** One tick of the axis: its label, and one value per series. */
export interface PlotPoint {
  label: string;
  values: number[];
}

/** A value the call wrote that is not a number, and where it sat. */
export interface PlotBadValue {
  /** Which entry of `points` it came from, 0-based. */
  at: number;
  label: string;

  /** The text that was in that cell, so the fix is obvious without re-counting. */
  value: string;
}

/** What the plotted points add up to — the reading a plot-less model checks against. */
export interface PlotMeasure {
  min: number;
  max: number;
  total: number;
  mean: number;

  /** The point that carries the most, and what it carries. */
  peak: string;
  peakValue: number;

  /** The ends of the axis, in the order they were sent. */
  first: string;
  last: string;
}

/**
 * A plot call's whole answer.
 *
 * `points` holds what is actually drawn — after the cap — so the row paints
 * exactly what the reading describes, and `omitted` says how much the cap cut.
 */
export interface ChartFigure {
  status: FigureStatus;

  kind: PlotKind;
  tone: PlotTone | null;

  height: number;
  width: number;

  grid: boolean;
  markers: boolean;
  fill: boolean;
  labels: boolean;
  dash: number | null;
  emphasis: number | null;

  /** The unit the call named, in the reading only: a plot draws no unit. */
  unit: string;

  /** One line the call put under the plot, for the human. */
  caption: string;

  /** The series, named. Empty when the plot carries one value per point. */
  series: string[];

  points: PlotPoint[];
  plotted: number;
  omitted: number;

  measure: PlotMeasure | null;

  bad: PlotBadValue[];

  error: string;
}

export type ChartFigureDetails = ChartFigure;

/** What a caller asked to be plotted, before any of it is read. */
export interface ChartPlotParams {
  points: readonly unknown[];
  series?: readonly unknown[];
  kind?: string;
  tone?: string;
  unit?: string;
  caption?: string;
  height?: number;
  width?: number;
  grid?: boolean;
  markers?: boolean;
  fill?: boolean;
  labels?: boolean;
  dash?: number | null;
  emphasis?: number | null;
}
