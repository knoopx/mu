/**
 * Turns a figure answer into what the transcript draws — a plot, or a tree.
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
import { counted } from "../../core/lib/agent/toolText";
import type { ToolRowCell } from "../../core/lib/ui/toolRowPaint";
import {
  CHART_RENDER_TOOL,
  TREE_RENDER_TOOL,
} from "../constants";
import type {
  ChartFigure,
  FigureStatus,
  PlotBadValue,
  PlotMeasure,
  PlotPoint,
  PlotTone,
  StructureNode,
  StructureStatus,
  TreeBadNode,
  TreeFigure,
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

/** The statuses a structure answer can carry. */
const STRUCTURE_STATUSES = [
  "ok",
  "empty",
  "invalid",
] as const satisfies readonly StructureStatus[];

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
        value:
          figure.status === "ok" ? String(figure.plotted) : "",
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

/* ---------------------------------------------------------- the tree view */

export interface TreeToolView {
  status: StructureStatus;

  /** The tree, or the shape of the refusal. Never absent: the header reads it too. */
  tree: TreeFigure;

  cells: ToolRowCell[];
}

const EMPTY_TREE: TreeFigure = {
  status: "empty",
  nodes: [],
  expanded: [],
  caption: "",
  counted: 0,
  drawn: 0,
  omitted: 0,
  folders: 0,
  leaves: 0,
  depth: 0,
  added: 0,
  removed: 0,
  bad: [],
  error: "",
};

function nodeOf(value: unknown): StructureNode | null {
  const node = detailsAs<StructureNode>(value);
  if (node === null) return null;
  const name = detailText(node.name);
  if (name === "") return null;
  const children = detailList<unknown>(node.children)
    .map(nodeOf)
    .filter((child): child is StructureNode => child !== null);
  return {
    name,
    folder: detailFlag(node.folder, children.length > 0),
    children,
    added: detailNumber(node.added),
    removed: detailNumber(node.removed),
  };
}

function treeBadOf(value: unknown): TreeBadNode {
  const bad = detailsAs<TreeBadNode>(value) ?? { under: "", value: "" };
  return {
    under: detailText(bad.under),
    value: detailText(bad.value),
  };
}

/** The tree a call left in its details, read as the JSON a resumed session keeps. */
function treeFigureOf(details: unknown): TreeFigure | null {
  const answer = detailsAs<TreeFigure>(details);
  if (answer === null) return null;
  const status = detailWord(answer.status, STRUCTURE_STATUSES);
  if (status === null || !Array.isArray(answer.nodes)) return null;

  return {
    status,
    nodes: answer.nodes
      .map(nodeOf)
      .filter((node): node is StructureNode => node !== null),
    expanded: detailStrings(answer.expanded),
    caption: detailText(answer.caption),
    counted: detailNumber(answer.counted),
    drawn: detailNumber(answer.drawn),
    omitted: detailNumber(answer.omitted),
    folders: detailNumber(answer.folders),
    leaves: detailNumber(answer.leaves),
    depth: detailNumber(answer.depth),
    added: detailNumber(answer.added),
    removed: detailNumber(answer.removed),
    bad: detailList<unknown>(answer.bad).map(treeBadOf),
    error: detailText(answer.error),
  };
}

/** The line a refusal leaves behind: how many nodes, and where the first one sits. */
export function treeFailureLine(tree: TreeFigure): string {
  const first = tree.bad[0];
  if (first === undefined) return tree.error;
  const where = `the node under ${first.under === "" ? "(the root)" : `“${first.under}”`}`;
  const shown = first.value === "" ? "(nothing)" : `“${first.value}”`;
  return tree.bad.length === 1
    ? `${tree.error}: ${where} holds ${shown}`
    : `${tree.error}: ${where} holds ${shown}, and ${String(tree.bad.length - 1)} more`;
}

export function treeToolViewOf(
  name: string,
  _args: Record<string, unknown> | undefined,
  details: unknown,
  itemStatus: string,
): TreeToolView | null {
  if (name.toLowerCase() !== TREE_RENDER_TOOL) return null;

  const tree = treeFigureOf(details) ?? EMPTY_TREE;
  const status: StructureStatus =
    itemStatus === "error" && tree.status === "ok" ? "empty" : tree.status;
  const moved = tree.added + tree.removed;

  return {
    status,
    tree,
    cells: [
      {
        label: "tree",
        value: status === "empty" ? "" : counted(tree.drawn, "node"),
      },
      { label: "folders", value: status === "ok" ? String(tree.folders) : "" },
      { label: "leaves", value: status === "ok" ? String(tree.leaves) : "" },
      { label: "depth", value: status === "ok" ? String(tree.depth) : "" },
      {
        label: "moved",
        value:
          status === "ok" && moved > 0
            ? `+${String(tree.added)} −${String(tree.removed)}`
            : "",
      },
      {
        label: "open",
        value:
          status === "ok" && tree.expanded.length > 0
            ? String(tree.expanded.length)
            : "",
      },
      {
        label: "cut",
        value: tree.omitted === 0 ? "" : counted(tree.omitted, "subtree"),
      },
    ],
  };
}
