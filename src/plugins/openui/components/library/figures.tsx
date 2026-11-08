/**
 * The figures area of the language: a program's data drawn as a *shape* rather
 * than as rows of cells.
 *
 * A `Table` says what each field of a row is; these say what a set of rows is
 * made of — which paths a change moved, how long each span of a run took, which
 * days carried the work, what a total is split between. Each one is adwaita's own
 * widget, so a program's figure wears the same colours, ramps and mono columns as
 * the app's own panels; none of them takes a size or a colour from the program.
 */

import type { JSX } from "react";
import { defineComponent, type ElementNode } from "@openuidev/lang-core";
import {
  ContributionHeatmap,
  SegmentBar,
  T,
  Timeline as AdwaitaTimeline,
  Trace as AdwaitaTrace,
  timelineTimeWidth,
  traceFigureWidth,
  traceLabelWidth,
  traceTotal,
  type HeatWeek,
  type Segment,
  type TimelineItem,
  type TimelineStatus,
  type TraceSpan,
} from "adwaita-gpuix";
import { FileTree, type FileTreeNode } from "adwaita-gpuix/ai";
import { z } from "zod/v4";

import { HAIRLINE } from "../../../core/lib/ui/tokens";
import { mutedText } from "../../../core/lib/ui/theme";
import {
  groupGap,
  innerGap,
  programFigureRole,
  programTitleWeight,
} from "../../lib/tokens";
import {
  programProgressTone,
  programStatusToTimeline,
  programTextColor,
  toneOfValue,
} from "../../lib/theme";
import type { ProgramContext } from "./context";
import { listProp, prop, textOf } from "./context";
import {
  cellOf,
  figureOf,
  listCell,
  numberCell,
  statusOf,
  textCell,
} from "./rows";

/* --------------------------------------------------------------- the tree */

const TREE_NAMES = ["name", "kind", "children", "added", "removed"] as const;

export const Tree = defineComponent({
  name: "Tree",
  description:
    "paths nested in folders — a changeset or a package, with what moved in each path",
  props: z.object({
    items: z.array(z.any()),

    /** Which folders stand open, by their path. Leave it out and the top level does. */
    expanded: z.array(z.union([z.string(), z.number()])).nullable().optional(),
  }),
  component: drawTree,
});

function treeNodeOf(row: unknown): FileTreeNode {
  const name = textCell(row, TREE_NAMES, 0) ?? "";
  const children = listCell(row, TREE_NAMES, 2);
  const kind = textCell(row, TREE_NAMES, 1) ?? "";
  const added = cellOf(row, TREE_NAMES, 3);
  const removed = cellOf(row, TREE_NAMES, 4);
  return {
    name,
    type: children.length > 0 || kind === "folder" ? "folder" : "file",
    ...(children.length > 0
      ? { children: children.map((child) => treeNodeOf(child)) }
      : {}),
    ...(added === undefined ? {} : { added: numberCell(row, TREE_NAMES, 3) }),
    ...(removed === undefined ? {} : { removed: numberCell(row, TREE_NAMES, 4) }),
  };
}

export function drawTree(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const items = listProp(node.props, "items");
  const expanded = listProp(node.props, "expanded").map((path) => String(path));

  return (
    <FileTree
      items={items.map(treeNodeOf)}
      variant="list"
      defaultExpandedPaths={expanded.length > 0 ? expanded : topLevelFolders(items)}
      style={{ width: "100%", minWidth: 0 }}
    />
  );
}

/** A tree the program says nothing about opens its first level, so the files are
 *  the thing the screen shows rather than a row of closed folders. */
function topLevelFolders(items: readonly unknown[]): string[] {
  return items
    .filter(
      (item) =>
        listCell(item, TREE_NAMES, 2).length > 0 ||
        (textCell(item, TREE_NAMES, 1) ?? "") === "folder",
    )
    .map((item) => textCell(item, TREE_NAMES, 0) ?? "");
}

/* ------------------------------------------------------------ the timeline */

const TIMELINE_NAMES = ["at", "title", "note", "status"] as const;

export const Timeline = defineComponent({
  name: "Timeline",
  description: "events in order: when, what happened, and which one is now",
  props: z.object({
    items: z.array(z.any()),
  }),
  component: drawTimeline,
});

function timelineStatus(value: unknown): TimelineStatus {
  const status = statusOf(value, "done");
  return programStatusToTimeline(status);
}

export function drawTimeline(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const items = listProp(node.props, "items");
  const rows: TimelineItem[] = items.map((row, index) => ({
    at: textCell(row, TIMELINE_NAMES, 0) ?? String(index + 1),
    title: textCell(row, TIMELINE_NAMES, 1) ?? "",
    ...(textCell(row, TIMELINE_NAMES, 2) === null
      ? {}
      : { note: textCell(row, TIMELINE_NAMES, 2) ?? "" }),
    status: timelineStatus(cellOf(row, TIMELINE_NAMES, 3)),
  }));

  return (
    <AdwaitaTimeline
      items={rows}
      timeWidth={timelineTimeWidth(ctx.t)}
      style={{ width: "100%", minWidth: 0 }}
    />
  );
}

/* ----------------------------------------------------------------- trace */

const SPAN_NAMES = ["label", "offset", "duration", "tone", "depth", "figure"] as const;

export const Trace = defineComponent({
  name: "Trace",
  description:
    "the spans of a run on one axis: what ran, when it started, how long it took",
  props: z.object({
    spans: z.array(z.any()),

    /** The length of the axis. Leave it out and the spans set it. */
    total: z.number().nullable().optional(),
  }),
  component: drawTrace,
});

export function drawTrace(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const rows = listProp(node.props, "spans");
  const spans: TraceSpan[] = rows.map((row) => ({
    label: textCell(row, SPAN_NAMES, 0) ?? "",
    offset: numberCell(row, SPAN_NAMES, 1),
    duration: numberCell(row, SPAN_NAMES, 2),
    ...(() => {
      const tone = toneOfValue(cellOf(row, SPAN_NAMES, 3));
      return tone === null ? {} : { tone: programProgressTone(tone) };
    })(),
    depth: numberCell(row, SPAN_NAMES, 4),
    ...(textCell(row, SPAN_NAMES, 5) === null
      ? {}
      : { figure: textCell(row, SPAN_NAMES, 5) ?? "" }),
  }));

  return (
    <AdwaitaTrace
      spans={spans}
      total={prop<number | null>(node.props, "total", null) ?? traceTotal(spans)}
      labelWidth={traceLabelWidth(ctx.t)}
      figureWidth={traceFigureWidth(ctx.t)}
      style={{ width: "100%", minWidth: 0 }}
    />
  );
}

/* --------------------------------------------------------------- the heat */

const DAY_LABELS = ["", "Tue", "", "Thu", "", "Sat", ""];

export const Heatmap = defineComponent({
  name: "Heatmap",
  description: "one value per day in columns of weeks, shaded by how much",
  props: z.object({
    values: z.array(z.any()),

    /** Which of the seven day rows is named. Leave it out for Tue, Thu, Sat. */
    dayLabels: z.array(z.union([z.string(), z.number()])).nullable().optional(),

    /** Month names spread across the columns, oldest first. */
    months: z.array(z.union([z.string(), z.number()])).nullable().optional(),
  }),
  component: drawHeatmap,
});

/** One value per day, in whatever shape the program wrote it. */
function heatValues(values: readonly unknown[]): number[] {
  return values.map((entry, index) =>
    Array.isArray(entry) || (typeof entry === "object" && entry !== null)
      ? numberCell(entry, ["label", "value"], 1)
      : numberCell(entry, ["value"], 0, index),
  );
}

/** Shade on the same five steps the widget paints its ramp with. */
function heatLevel(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.max(1, Math.min(4, Math.ceil((value / max) * 4)));
}

/**
 * Cut a run of days into week columns, shade each day against the busiest one,
 * and spread the month names across the columns the program named.
 */
function heatWeeks(
  values: readonly number[],
  months: readonly string[],
): HeatWeek[] {
  const max = values.reduce((highest, value) => Math.max(highest, value), 0);
  const columns = Math.ceil(values.length / 7);
  // One name per `stride` columns, so six months over 26 columns says the month
  // where the month actually starts rather than all in the first third.
  const stride =
    months.length === 0
      ? 0
      : Math.max(1, Math.floor(columns / months.length));
  const weeks: HeatWeek[] = [];

  for (let column = 0; column < columns; column += 1) {
    const at = column * 7;
    weeks.push({
      monthLabel:
        stride > 0 && column % stride === 0
          ? (months[Math.floor(column / stride)] ?? "")
          : "",
      cells: values
        .slice(at, at + 7)
        .map((value, day) => ({
          key: `d${String(at + day)}`,
          count: value,
          level: heatLevel(value, max),
          future: false,
        })),
    });
  }
  return weeks;
}

export function drawHeatmap(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const values = heatValues(listProp(node.props, "values"));
  const months = listProp(node.props, "months").map((month) => String(month));
  const dayLabels = listProp(node.props, "dayLabels", DAY_LABELS).map((label) =>
    String(label),
  );

  return (
    <ContributionHeatmap
      weeks={heatWeeks(values, months)}
      dayLabels={dayLabels.length === 7 ? dayLabels : DAY_LABELS}
      style={{ minWidth: 0 }}
    />
  );
}

/* ------------------------------------------------------------- breakdown */

const SEGMENT_NAMES = ["label", "value", "tone"] as const;
const FIGURE_ROW_NAMES = ["label", "detail", "amount", "tone"] as const;

export const Breakdown = defineComponent({
  name: "Breakdown",
  description:
    "a total, the parts it is made of drawn as one bar, and each part's own figures",
  props: z.object({
    total: z.union([z.string(), z.number()]),
    segments: z.array(z.any()),
    rows: z.array(z.any()),
    caption: z.union([z.string(), z.number()]).nullable().optional(),
    trailing: z.union([z.string(), z.number()]).nullable().optional(),
  }),
  component: drawBreakdown,
});

export function drawBreakdown(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const segmentRows = listProp(node.props, "segments");
  const figureRows = listProp(node.props, "rows");
  const caption = textOf(node.props.caption);
  const trailing = textOf(node.props.trailing);
  const total = node.props.total;

  const segments: Segment[] = segmentRows.map((row) => {
    const tone = toneOfValue(cellOf(row, SEGMENT_NAMES, 2));
    return {
      value: numberCell(row, SEGMENT_NAMES, 1),
      ...(tone === null ? {} : { tone: programProgressTone(tone) }),
    };
  });

  const spent = segments.reduce((sum, part) => sum + part.value, 0);
  const tail =
    typeof total === "number" && Number.isFinite(total) && total > spent
      ? total - spent
      : 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        gap: groupGap(ctx.t),
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          width: "100%",
          minWidth: 0,
          gap: innerGap(ctx.t),
        }}
      >
        <T
          size={programFigureRole}
          weight={programTitleWeight(ctx.t)}
          color={ctx.t.color.text.primary}
          clamp={1}
          style={{ minWidth: 0 }}
        >
          {textOf(total) ?? ""}
        </T>
        {caption === null ? null : (
          <T
            size="body"
            color={mutedText(ctx.t)}
            clamp={1}
            style={{ minWidth: 0 }}
          >
            {caption}
          </T>
        )}
        <div style={{ flexGrow: 1, minWidth: 0, minHeight: 1 }} />
        {trailing === null ? null : (
          <T
            size="caption"
            color={mutedText(ctx.t)}
            clamp={1}
            style={{
              fontFamily: ctx.t.type.fontFamilyMono,
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {trailing}
          </T>
        )}
      </div>

      {segments.length === 0 ? null : (
        <SegmentBar
          segments={segments}
          tail={tail}
          style={{ minWidth: 0 }}
        />
      )}

      {figureRows.map((row, index) => (
        <BreakdownRow
          key={`b-${String(index)}`}
          row={row}
          ctx={ctx}
          last={index === figureRows.length - 1}
        />
      ))}
    </div>
  );
}

/** One part of a breakdown: its name, the figures that say how it got there, and its amount. */
function BreakdownRow({
  row,
  ctx,
  last,
}: {
  row: unknown;
  ctx: ProgramContext;
  last: boolean;
}): JSX.Element {
  const label = textCell(row, FIGURE_ROW_NAMES, 0) ?? "";
  const detail = textCell(row, FIGURE_ROW_NAMES, 1);
  const amount = cellOf(row, FIGURE_ROW_NAMES, 2);
  const tone = toneOfValue(cellOf(row, FIGURE_ROW_NAMES, 3));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          width: "100%",
          minWidth: 0,
          gap: innerGap(ctx.t),
          paddingTop: innerGap(ctx.t),
          paddingBottom: last ? 0 : innerGap(ctx.t),
        }}
      >
        <T
          size="list"
          color={ctx.t.color.text.primary}
          clamp={1}
          style={{ minWidth: 0 }}
        >
          {label}
        </T>
        <div style={{ flexGrow: 1, minWidth: 0, minHeight: 1 }} />
        {detail === null ? null : (
          <T
            size="caption"
            color={mutedText(ctx.t)}
            clamp={1}
            style={{
              fontFamily: ctx.t.type.fontFamilyMono,
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {detail}
          </T>
        )}
        <T
          size="list"
          color={programTextColor(ctx.t, tone)}
          clamp={1}
          style={{
            fontFamily: ctx.t.type.fontFamilyMono,
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {figureOf(amount)}
        </T>
      </div>
      {last ? null : (
        <div
          style={{
            width: "100%",
            height: HAIRLINE,
            flexShrink: 0,
            backgroundColor: ctx.t.color.divider.faint,
          }}
        />
      )}
    </div>
  );
}
