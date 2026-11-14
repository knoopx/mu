/**
 * `chart-render` — numbers in, a plot out.
 *
 * The picture is painted in the transcript for the human. What the model gets is
 * a reading of it: what was plotted, what the axis runs between, what the values
 * add up to, and the points as figures — which is how a plot that came out wrong
 * is caught by something that cannot see it. A value that is not a number comes
 * back naming the point it sat on.
 */

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { toolResult } from "../../core/lib/agent/toolText";
import { CHART_RENDER_TOOL, CHART_TOOL_LABEL, MAX_SERIES } from "../constants";
import {
  chartAnswerOf,
  chartEmptyAnswer,
  chartInvalidAnswer,
} from "../lib/answer";
import { chartPlotOf } from "../lib/plot";
import type { ChartFigure, ChartPlotParams } from "../types";

/** One cell of a point: an axis label, or a value. */
const CellSchema = Type.Union([
  Type.Number({ description: "a value" }),
  Type.String({ maxLength: 48, description: "an axis label" }),
]);

/** One axis tick: a label, then one value per series. */
const PointSchema = Type.Array(CellSchema, {
  minItems: 1,
  maxItems: MAX_SERIES + 1,
  description:
    "One point: `[label, value]`, or `[label, v1, v2, …]` for one value per series — the first cell is the axis label, the rest are numbers.",
});

const RenderParametersSchema = Type.Object({
  points: Type.Array(PointSchema, {
    minItems: 0,
    maxItems: 400,
    description:
      'The points to plot, in the order they stand on the axis: `[["Jan", 120], ["Feb", 98], ["Mar", 412]]`. A value is a bare number — `412`, not `"412 ms"`.',
  }),
  series: Type.Optional(
    Type.Array(Type.String({ maxLength: 32 }), {
      maxItems: MAX_SERIES,
      description:
        'Names for the series, in the order their values sit in each point — `["builds", "tests"]` plots two values per point and labels them. Omit it for one value per point.',
    }),
  ),
  kind: Type.Optional(
    Type.Union([Type.Literal("bar"), Type.Literal("line")], {
      description:
        "`bar` across a category axis (the default); `line` for a series that runs across an interval.",
    }),
  ),
  unit: Type.Optional(
    Type.String({
      maxLength: 16,
      description:
        "The unit the figures are in (`ms`, `tokens`, `MB`). It appears in the answer's readings; the plot itself draws no unit.",
    }),
  ),
  tone: Type.Optional(
    Type.Union(
      [
        Type.Literal("accent"),
        Type.Literal("ink"),
        Type.Literal("muted"),
        Type.Literal("info"),
        Type.Literal("success"),
        Type.Literal("warning"),
        Type.Literal("danger"),
      ],
      {
        description:
          "The plot's colour word, resolved against the theme the window is wearing (default `accent`).",
      },
    ),
  ),
  caption: Type.Optional(
    Type.String({
      maxLength: 120,
      description: "One line under the plot, for the reader of the log.",
    }),
  ),
  height: Type.Optional(
    Type.Number({
      minimum: 72,
      maximum: 360,
      description: "The plot box's height in px (default 168).",
    }),
  ),
  grid: Type.Optional(
    Type.Boolean({
      description: "Draw the grid lines behind the plot (default false).",
    }),
  ),
  markers: Type.Optional(
    Type.Boolean({
      description: "Draw a marker per point on a line (default true).",
    }),
  ),
  fill: Type.Optional(
    Type.Boolean({
      description: "Fill under a line, to its baseline (default false).",
    }),
  ),
  labels: Type.Optional(
    Type.Boolean({
      description: "Draw the axis labels under the plot (default true).",
    }),
  ),
  dash: Type.Optional(
    Type.Number({
      minimum: 1,
      description:
        "Break a line into dashes of this many px: a planned run, not a measured one.",
    }),
  ),
  emphasis: Type.Optional(
    Type.Number({
      minimum: 0,
      description:
        "Which point the reader is standing at — now, the end, the selected row. Its marker is drawn bigger.",
    }),
  ),
});

export function executeChartRender(
  params: ChartPlotParams,
): AgentToolResult<ChartFigure> {
  const figure = chartPlotOf(params);

  if (figure.status === "invalid") {
    return toolResult(chartInvalidAnswer(figure), figure);
  }
  if (figure.status === "empty") {
    return toolResult(chartEmptyAnswer(figure), figure);
  }
  return toolResult(chartAnswerOf(figure), figure);
}

export const chartRenderTool: ToolDefinition<
  typeof RenderParametersSchema,
  ChartFigure
> = {
  name: CHART_RENDER_TOOL,
  label: CHART_TOOL_LABEL,
  description:
    "Plot numbers as a chart: bars across a category axis, or a line with markers and an optional fill, one or " +
    "several series on it. The picture is painted in the transcript for the human. The answer states how many " +
    "points were plotted, the span of the axis, the range, total, mean and peak, and the points as figures — so a " +
    "plot that came out wrong is visible without seeing it. A value that is not a number refuses the call and names " +
    "the point and the cell it sat on.",
  promptSnippet:
    "Plot numbers as a chart in the transcript; the answer reads the plot back",
  promptGuidelines: [
    "Use chart-render when the answer is a set of numbers and their shape: counts per bucket, a series over time, several series on one axis.",
    "Points are `[label, value, …]`: the first cell is the axis label, every cell after it is a value — one per series, in the order `series` names them.",
    'A value is a bare number: `412`, not `"412 ms"`. The unit goes in `unit` and in the label, never in a value\'s cell.',
    "You cannot see the plot — read the axis, range, total, mean and peak the answer gives you. A peak in the wrong bucket means the points went in the wrong order.",
    "More than 64 points is a texture, not a picture: group the values (by day, by week, the top N) and send those; the answer says how many were not plotted.",
    "A value that is not a number refuses the whole call rather than drawing a short bar: fix the named cell and re-send.",
    "Use openui-render instead when the figure has to be operated — a filter that changes what is plotted, a picker, several figures on one screen.",
  ],

  executionMode: "sequential",
  parameters: RenderParametersSchema,

  async execute(_toolCallId, params) {
    return executeChartRender({
      points: params.points,
      series: params.series ?? [],
      kind: params.kind,
      tone: params.tone,
      unit: params.unit,
      caption: params.caption,
      height: params.height,
      grid: params.grid,
      markers: params.markers,
      fill: params.fill,
      labels: params.labels,
      dash: params.dash ?? null,
      emphasis: params.emphasis ?? null,
    });
  },
};
