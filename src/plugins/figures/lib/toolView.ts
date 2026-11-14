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
  detailFlag,
  detailNumber,
  detailText,
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

/** The statuses a plot answer can carry; anything else is not a plot. */
const FIGURE_STATUSES: readonly string[] = ["ok", "empty", "invalid"];

/** A number the call may have left out — where the figure holds null, not 0. */
const optionalNumber = (value: unknown): number | null =>
  typeof value === "number" ? value : null;

/** The colour word the call may have left out. */
const optionalTone = (value: unknown): PlotTone | null =>
  typeof value === "string" ? (value as PlotTone) : null;

/** The series names, dropping what a JSON answer turned into something else. */
const namesOf = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((name): name is string => typeof name === "string")
    : [];

/** The axis a plot was measured across — the figures the answer reads back. */
function measureOf(value: unknown): PlotMeasure | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  return {
    min: detailNumber(record["min"]),
    max: detailNumber(record["max"]),
    total: detailNumber(record["total"]),
    mean: detailNumber(record["mean"]),
    peak: detailText(record["peak"]),
    peakValue: detailNumber(record["peakValue"]),
    first: detailText(record["first"]),
    last: detailText(record["last"]),
  };
}

function figureOf(value: unknown): ChartFigure | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const status = detailText(record["status"]);
  if (!FIGURE_STATUSES.includes(status)) return null;

  return {
    status: status as FigureStatus,
    kind: detailText(record["kind"]) === "line" ? "line" : "bar",
    tone: optionalTone(record["tone"]),
    height: detailNumber(record["height"]),
    width: detailNumber(record["width"]),
    grid: detailFlag(record["grid"], false),
    markers: detailFlag(record["markers"], true),
    fill: detailFlag(record["fill"], false),
    labels: detailFlag(record["labels"], true),
    dash: optionalNumber(record["dash"]),
    emphasis: optionalNumber(record["emphasis"]),
    unit: detailText(record["unit"]),
    caption: detailText(record["caption"]),
    series: namesOf(record["series"]),
    points: Array.isArray(record["points"])
      ? record["points"]
          .map(pointOf)
          .filter((point): point is PlotPoint => point !== null)
      : [],
    plotted: detailNumber(record["plotted"]),
    omitted: detailNumber(record["omitted"]),
    measure: measureOf(record["measure"]),
    bad: Array.isArray(record["bad"]) ? record["bad"].map(badOf) : [],
    error: detailText(record["error"]),
  };
}

function pointOf(value: unknown): PlotPoint | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record["values"])) return null;
  return {
    label: detailText(record["label"]),
    values: record["values"].map((entry) => detailNumber(entry)),
  };
}

function badOf(value: unknown): PlotBadValue {
  if (typeof value !== "object" || value === null) {
    return { at: 0, label: "", value: "" };
  }
  const record = value as Record<string, unknown>;
  return {
    at: detailNumber(record["at"]),
    label: detailText(record["label"]),
    value: detailText(record["value"]),
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
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const name = detailText(record["name"]);
  if (name === "") return null;
  const children = Array.isArray(record["children"])
    ? record["children"]
        .map(nodeOf)
        .filter((node): node is StructureNode => node !== null)
    : [];
  return {
    name,
    folder: detailFlag(record["folder"], children.length > 0),
    children,
    added: detailNumber(record["added"]),
    removed: detailNumber(record["removed"]),
  };
}

function treeBadOf(value: unknown): TreeBadNode {
  const record =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  return {
    under: detailText(record["under"]),
    value: detailText(record["value"]),
  };
}

/** The guard a structure reader opens with: a record, and a status word. */
function detailsOf(details: unknown): {
  record: Record<string, unknown>;
  status: StructureStatus;
} | null {
  if (typeof details !== "object" || details === null) return null;
  const record = details as Record<string, unknown>;
  const status = detailText(record["status"]);
  if (status !== "ok" && status !== "empty" && status !== "invalid")
    return null;
  return { record, status: status as StructureStatus };
}

/** The tree a call left in its details, read as the JSON a resumed session keeps. */
function treeFigureOf(details: unknown): TreeFigure | null {
  const read = detailsOf(details);
  if (read === null) return null;
  const { record, status } = read;
  if (!Array.isArray(record["nodes"])) return null;

  return {
    status,
    nodes: record["nodes"]
      .map(nodeOf)
      .filter((node): node is StructureNode => node !== null),
    expanded: Array.isArray(record["expanded"])
      ? record["expanded"].filter(
          (path): path is string => typeof path === "string",
        )
      : [],
    caption: detailText(record["caption"]),
    counted: detailNumber(record["counted"]),
    drawn: detailNumber(record["drawn"]),
    omitted: detailNumber(record["omitted"]),
    folders: detailNumber(record["folders"]),
    leaves: detailNumber(record["leaves"]),
    depth: detailNumber(record["depth"]),
    added: detailNumber(record["added"]),
    removed: detailNumber(record["removed"]),
    bad: Array.isArray(record["bad"]) ? record["bad"].map(treeBadOf) : [],
    error: detailText(record["error"]),
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
