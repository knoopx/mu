/**
 * The data area of the language: the rows and figures a program shows.
 *
 * A `Table` is cells of text in equal columns, not a DOM table — the same
 * equal-column measure the log paints its own tables in, so a program's rows
 * and the agent's rows read as one kind of thing.
 */

import type { JSX } from "react";
import { defineComponent, type ElementNode } from "@openuidev/lang-core";
import { Chart as AdwaitaChart, ProgressBar, T } from "adwaita-gpuix";
import type { ChartData, ChartDataPoint, ChartSeriesPoint } from "adwaita-gpuix";
import { z } from "zod/v4";

import { HAIRLINE } from "../../../core/lib/ui/tokens";
import { mutedText } from "../../../core/lib/ui/theme";
import {
  CHART_CANVAS_WIDTH,
  CHART_HEIGHT,
  innerGap,
  programEmphasisWeight,
  programRowHeight,
  programTextRole,
  programTitleWeight,
  type ProgramTextSize,
} from "../../lib/tokens";
import {
  programProgressTone,
  programTextColor,
  toneOfValue,
  type ProgramTone,
} from "../../lib/theme";
import type { ProgramContext } from "./context";
import {
  ProgramFigureRow,
  listProp,
  prop,
  textOf,
  textProp,
} from "./context";
import { cellText, isFigure, numberOf } from "./rows";

export const Table = defineComponent({
  name: "Table",
  description:
    "columns of text: a header row, then one row per item, each row a list of cells",
  props: z.object({
    columns: z.array(z.union([z.string(), z.number()])),
    rows: z.array(z.any()),
  }),
  component: drawTable,
});

export const Stat = defineComponent({
  name: "Stat",
  description: "one figure: its label, its value, and how it moved",
  props: z.object({
    label: z.union([z.string(), z.number()]),
    value: z.union([z.string(), z.number()]),
    delta: z.union([z.string(), z.number()]).nullable().optional(),
    tone: z.string().nullable().optional(),
    size: z.enum(["sm", "md", "lg", "xl"]).nullable().optional(),
  }),
  component: drawStat,
});

export const Bar = defineComponent({
  name: "Bar",
  description:
    "a figure against its maximum, drawn as a fill: optionally weighted, with one line of its own under it",
  props: z.object({
    label: z.union([z.string(), z.number()]),
    value: z.number(),
    max: z.number().nullable().optional(),
    tone: z.string().nullable().optional(),

    /** How much this one counts: printed as `×3` beside the figure. */
    weight: z.union([z.string(), z.number()]).nullable().optional(),

    /** The line that says why the figure is what it is. */
    caption: z.union([z.string(), z.number()]).nullable().optional(),
  }),
  component: drawBar,
});

/**
 * Many values on one canvas. `Bar` is one figure per row; a `Chart` is the whole
 * set drawn together — bars across a category axis, or a line with markers and
 * an area fill — and it is adwaita's own plot, colours and axis included.
 */
export const Chart = defineComponent({
  name: "Chart",
  description:
    "many values on one canvas: bars across a category axis, or a line with markers and a fill",
  props: z.object({
    points: z.array(z.any()),
    kind: z.enum(["bar", "line"]).nullable().optional(),
    height: z.number().nullable().optional(),
    width: z.number().nullable().optional(),
    grid: z.boolean().nullable().optional(),
    markers: z.boolean().nullable().optional(),
    fill: z.boolean().nullable().optional(),
    labels: z.boolean().nullable().optional(),
    tone: z.string().nullable().optional(),

    /** Break the line into dashes: a planned run, not a measured one. */
    dash: z.number().nullable().optional(),

    /** Which point the reader is standing at — now, the end, the selected row. */
    emphasis: z.number().nullable().optional(),
  }),
  component: drawChart,
});

/* ------------------------------------------------------------------ draws */

const cellsOf = (row: unknown): unknown[] =>
  Array.isArray(row) ? row : [row];

export function drawTable(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const columns = listProp(node.props, "columns").map(cellText);
  const rows = listProp(node.props, "rows");
  const width = Math.max(columns.length, 1);

  const rule = (color: string) => (
    <div
      style={{
        width: "100%",
        height: HAIRLINE,
        flexShrink: 0,
        backgroundColor: color,
      }}
    />
  );

  const cell = (value: unknown, index: number, head: boolean) => {
    const text = cellText(value);
    // A column of figures is read down, not across: it stands on the right of its
    // column and is set in mono, so the digits line up under the header.
    const figure = !head && isFigure(text);
    return (
      <div
        key={`c-${String(index)}`}
        style={{
          flexGrow: 1,
          flexBasis: 0,
          minWidth: 0,
          display: "flex",
        }}
      >
        <T
          size={head ? "caption" : "list"}
          color={head ? mutedText(ctx.t) : ctx.t.color.text.primary}
          weight={head ? programEmphasisWeight(ctx.t) : undefined}
          align={figure ? "right" : undefined}
          clamp={2}
          style={{
            flexShrink: 1,
            minWidth: 0,
            width: "100%",
            fontFamily: figure ? ctx.t.type.fontFamilyMono : undefined,
            whiteSpace: figure ? "nowrap" : undefined,
          }}
        >
          {text}
        </T>
      </div>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
      }}
    >
      {columns.length === 0 ? null : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            minWidth: 0,
            gap: innerGap(ctx.t),
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              width: "100%",
              minWidth: 0,
              gap: innerGap(ctx.t),
            }}
          >
            {columns.map((entry, index) => cell(entry, index, true))}
          </div>
          {rule(ctx.t.color.divider.default)}
        </div>
      )}
      {rows.map((row, rowIndex) => (
        <div
          key={`r-${String(rowIndex)}`}
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
              minHeight: programRowHeight,
              width: "100%",
              minWidth: 0,
              gap: innerGap(ctx.t),
            }}
          >
            {cellsOf(row)
              .slice(0, width)
              .map((entry, index) => cell(entry, index, false))}
          </div>
          {rule(ctx.t.color.divider.faint)}
        </div>
      ))}
    </div>
  );
}

export function drawStat(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const tone = prop<ProgramTone | null>(node.props, "tone", null);
  const delta = textOf(node.props.delta);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        gap: innerGap(ctx.t),
      }}
    >
      <T size="caption" color={mutedText(ctx.t)} clamp={2} style={{ minWidth: 0 }}>
        {textProp(node.props, "label")}
      </T>
      <T
        size={programTextRole(prop<ProgramTextSize>(node.props, "size", "lg"))}
        weight={programTitleWeight(ctx.t)}
        color={programTextColor(ctx.t, tone)}
        clamp={1}
        style={{ minWidth: 0 }}
      >
        {textProp(node.props, "value")}
      </T>
      {delta === null ? null : (
        <T
          size="caption"
          color={programTextColor(ctx.t, tone === null ? "muted" : tone)}
          clamp={2}
          style={{ minWidth: 0 }}
        >
          {delta}
        </T>
      )}
    </div>
  );
}

/** One axis tick: a label with a value, or a label with a bundle of series. */
const pointOf = (entry: unknown, index: number): ChartDataPoint | ChartSeriesPoint => {
  if (Array.isArray(entry)) {
    const label = cellText(entry[0]);
    const rest = entry.slice(1);
    if (rest.length <= 1) return { label, value: numberOf(rest[0]) };
    return {
      label,
      values: rest.map((cell, at) => ({ name: `s${String(at + 1)}`, value: numberOf(cell) })),
    };
  }
  if (typeof entry === "object" && entry !== null) {
    const record = entry as Record<string, unknown>;
    const label = cellText(record.label ?? record.name ?? record.file);
    if (Array.isArray(record.values)) {
      return {
        label,
        values: (record.values as Record<string, unknown>[]).map((series) => ({
          name: cellText(series.name ?? series.label),
          value: numberOf(series.value),
        })),
      };
    }
    return { label, value: numberOf(record.value) };
  }
  return { label: String(index + 1), value: numberOf(entry) };
};

export function drawChart(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const kind = prop<"bar" | "line">(node.props, "kind", "bar");
  const tone = prop<ProgramTone | null>(node.props, "tone", null);
  const data = listProp(node.props, "points").map(pointOf);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
      }}
    >
      <AdwaitaChart
        data={data as ChartData}
        type={kind}
        color={programTextColor(ctx.t, tone === null ? "accent" : tone)}
        height={prop<number>(node.props, "height", CHART_HEIGHT)}
        width={prop<number>(node.props, "width", CHART_CANVAS_WIDTH)}
        grid={prop(node.props, "grid", false)}
        markers={kind === "line" ? prop(node.props, "markers", true) : false}
        fill={kind === "line" ? prop(node.props, "fill", false) : false}
        labels={prop(node.props, "labels", true)}
        dash={prop<number | null>(node.props, "dash", null) ?? undefined}
        emphasis={prop<number | null>(node.props, "emphasis", null) ?? undefined}
        style={{ width: "100%", minWidth: 0 }}
      />
    </div>
  );
}

export function drawBar(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const value = prop(node.props, "value", 0);
  const max = prop<number | null>(node.props, "max", null);
  const tone = toneOfValue(node.props.tone);
  const weight = textOf(node.props.weight);
  const caption = textOf(node.props.caption);
  const percent = max === null || max <= 0 ? 0 : Math.round((value / max) * 100);
  const figure = Number.isFinite(value) ? String(Math.round(value * 100) / 100) : "0";

  return (
    <ProgramFigureRow
      ctx={ctx}
      label={textProp(node.props, "label")}
      figure={figure}
      figureColor={programTextColor(ctx.t, tone === null ? "ink" : tone)}
      figureMono
      between={
        weight === null ? null : (
          <T
            size="caption"
            color={mutedText(ctx.t)}
            clamp={1}
            style={{ minWidth: 0 }}
          >
            {weight.startsWith("×") || weight.startsWith("x")
              ? weight
              : `×${weight}`}
          </T>
        )
      }
      body={
        <>
          <ProgressBar
            value={Math.max(0, Math.min(100, percent))}
            color={programProgressTone(tone)}
          />
          {caption === null ? null : (
            <T size="body" color={mutedText(ctx.t)} clamp={3} style={{ minWidth: 0 }}>
              {caption}
            </T>
          )}
        </>
      }
    />
  );
}
