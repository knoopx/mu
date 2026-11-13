import { CHART_RENDER_TOOL } from "../../src/plugins/figures/constants";
import {
  chartAnswerOf,
  chartInvalidAnswer,
} from "../../src/plugins/figures/lib/answer";
import { chartPlotOf } from "../../src/plugins/figures/lib/plot";
import { toolCallFixture, type ToolFixture } from "./tool";

/** What the agent worked out from the log: commits per month, in order. */
export const CHART_POINTS: Array<Array<string | number>> = [
  ["Apr", 41],
  ["May", 63],
  ["Jun", 88],
  ["Jul", 52],
  ["Aug", 117],
  ["Sep", 96],
  ["Oct", 134],
  ["Nov", 121],
  ["Dec", 74],
];

const params = {
  points: CHART_POINTS,
  kind: "bar",
  unit: "commits",
  caption:
    "one change per working day, most months — the December drop is the holiday gap",
  grid: true,
  emphasis: 6,
};

const figure = chartPlotOf(params);

/** A plot that drew, and the reading its answer gave the model. */
export const CHART_ITEM: ToolFixture = toolCallFixture(
  "call-chart",
  CHART_RENDER_TOOL,
  params,
  "ok",
  chartAnswerOf(figure),
  { details: figure },
);

/** The same call a spreadsheet wrote: a figure with a comma in it is not a number. */
const BROKEN_PARAMS = {
  points: [
    ["Oct", "1,234"],
    ["Nov", 121],
  ] as Array<Array<string | number>>,
  kind: "bar",
  unit: "commits",
};

const broken = chartPlotOf(BROKEN_PARAMS);

export const CHART_BAD_ITEM: ToolFixture = toolCallFixture(
  "call-chart-broken",
  CHART_RENDER_TOOL,
  BROKEN_PARAMS,
  "ok",
  chartInvalidAnswer(broken),
  { details: broken },
);

export const CHART_ANSWER =
  "The run picked up in August and peaked in October. Two things sit under the peak: the change feed was rebuilt that month, and the review queue was halved. Nothing was lost over the holiday gap in December — the December bars are the days the project was actually open";
