/**
 * The data area of the language: the rows and figures a program shows.
 *
 * A `Table` is adwaita's `Table` — the same component a `table-render` answer
 * paints with — so a program's rows and the agent's rows are one kind of thing:
 * cells of text in equal columns, one line to a row, rules between them.
 */

import type { JSX } from "react";
import { defineComponent, type ElementNode } from "@openuidev/lang-core";
import {
  Chart as AdwaitaChart,
  ChartLegend,
  ProgressBar,
  Sparkline as AdwaitaSparkline,
  Table as AdwaitaTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  T,
} from "adwaita-gpuix";
import { type StyleDesc } from "@gpuix/react";
import { z } from "zod/v4";

import { mutedText } from "../../../core/lib/ui/theme";
import {
  CHART_CANVAS_WIDTH,
  CHART_HEIGHT,
  MAX_POINTS,
} from "../../../figures/constants";
import {
  capPlot,
  coercePlot,
  plotColor,
  plotData,
  plotKindOf,
  plotToneOf,
  seriesLegend,
  seriesNamesOf,
} from "../../../figures/lib/plot";
import {
  innerGap,
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
import { ProgramFigureRow, listProp, prop, textOf, textProp } from "./context";
import { cellText, isFigure } from "./rows";

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
 *
 * The points are read by the same contract `chart-render` reads its parameters
 * by, so a program's plot and a tool's plot are one thing: a point is a label and
 * one value per series, and a value that is not a number is not plotted.
 */
export const Chart = defineComponent({
  name: "Chart",
  description:
    "many values on one canvas: bars across a category axis, or a line with markers and a fill",
  props: z.object({
    points: z.array(z.any()),

    /** Names for the series, in the order their values sit in each point. */
    series: z
      .array(z.union([z.string(), z.number()]))
      .nullable()
      .optional(),

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

const cellsOf = (row: unknown): unknown[] => (Array.isArray(row) ? row : [row]);

export function drawTable(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const columns = listProp(node.props, "columns").map(cellText);
  const rows = listProp(node.props, "rows");
  const width = Math.max(columns.length, 1);

  const t = ctx.t;

  /** A column of figures is read down, not across: it stands on the right of its
   *  column and is set in mono, so the digits line up under the header. */
  const figureStyle = (figure: boolean): StyleDesc | undefined =>
    figure
      ? { fontFamily: t.type.fontFamilyMono, whiteSpace: "nowrap" }
      : undefined;

  /**
   * adwaita's table, not a column of divs dressed as one: the same component a
   * `table-render` answer paints with, so a program's rows and the agent's rows
   * are one kind of thing — one line per row, a rule between rows, a header
   * divided from what it names, and no box drawn around a block that already
   * sits inside a pane.
   */
  return (
    <AdwaitaTable
      density="compact"
      frame="bare"
      style={{ width: "100%", minWidth: 0 }}
    >
      {columns.length === 0 ? null : (
        <TableHeader>
          {columns.map((column, index) => (
            <TableHead key={`h-${column}-${String(index)}`}>{column}</TableHead>
          ))}
        </TableHeader>
      )}
      <TableBody>
        {rows.map((row, rowIndex) => (
          <TableRow key={`r-${String(rowIndex)}`}>
            {cellsOf(row)
              .slice(0, width)
              .map((entry, index) => {
                const text = cellText(entry);
                const figure = isFigure(text);
                return (
                  <TableCell
                    key={`c-${String(rowIndex)}-${String(index)}`}
                    align={figure ? "right" : undefined}
                    style={figureStyle(figure)}
                  >
                    {text}
                  </TableCell>
                );
              })}
          </TableRow>
        ))}
      </TableBody>
    </AdwaitaTable>
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
      <T
        size="caption"
        color={mutedText(ctx.t)}
        clamp={2}
        style={{ minWidth: 0 }}
      >
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

export function drawChart(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const kind = plotKindOf(node.props.kind);
  const read = coercePlot(listProp(node.props, "points"));
  const capped = capPlot(read.points, MAX_POINTS);

  const series = seriesNamesOf(
    listProp(node.props, "series").map((name) => cellText(name)),
    { ...read, points: capped.points },
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        gap: innerGap(ctx.t),
      }}
    >
      <AdwaitaChart
        data={plotData(capped.points, series)}
        type={kind}
        color={plotColor(ctx.t, plotToneOf(node.props.tone))}
        height={prop<number>(node.props, "height", CHART_HEIGHT)}
        width={prop<number>(node.props, "width", CHART_CANVAS_WIDTH)}
        grid={prop(node.props, "grid", false)}
        markers={kind === "line" ? prop(node.props, "markers", true) : false}
        fill={kind === "line" ? prop(node.props, "fill", false) : false}
        labels={prop(node.props, "labels", true)}
        dash={prop<number | null>(node.props, "dash", null) ?? undefined}
        emphasis={
          prop<number | null>(node.props, "emphasis", null) ?? undefined
        }
        style={{ width: "100%", minWidth: 0 }}
      />
      {series.length === 0 ? null : (
        <ChartLegend items={seriesLegend(series, ctx.t)} />
      )}
    </div>
  );
}

export function drawBar(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const value = prop(node.props, "value", 0);
  const max = prop<number | null>(node.props, "max", null);
  const tone = toneOfValue(node.props.tone);
  const weight = textOf(node.props.weight);
  const caption = textOf(node.props.caption);
  const percent =
    max === null || max <= 0 ? 0 : Math.round((value / max) * 100);
  const figure = Number.isFinite(value)
    ? String(Math.round(value * 100) / 100)
    : "0";

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
            <T
              size="body"
              color={mutedText(ctx.t)}
              clamp={3}
              style={{ minWidth: 0 }}
            >
              {caption}
            </T>
          )}
        </>
      }
    />
  );
}

/* ------------------------------------------------------- progress, series */

/** How far a run has got, said as its own figure rather than as a meter beside one. */
export const Progress = defineComponent({
  name: "Progress",
  description:
    "how far something has got: its label, how much is done, and the whole it is a part of",
  props: z.object({
    label: z.union([z.string(), z.number()]),
    value: z.number(),
    max: z.number().nullable().optional(),
    tone: z.string().nullable().optional(),
    caption: z.string().nullable().optional(),
  }),
  component: drawProgress,
});

/** The shape of a series, with no axes to read: a sparkline under a metric, a trend beside a figure. */
export const Sparkline = defineComponent({
  name: "Sparkline",
  description:
    "a run of numbers drawn as one small line: the shape of a series, with no axes to read",
  props: z.object({
    values: z.array(z.number()),
    label: z.union([z.string(), z.number()]).nullable().optional(),
    tone: z.string().nullable().optional(),
  }),
  component: drawSparkline,
});

export function drawProgress(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const value = prop(node.props, "value", 0);
  const max = prop(node.props, "max", 100);
  const tone = toneOfValue(node.props.tone);
  const caption = textOf(node.props.caption);
  const percent = max <= 0 ? 0 : Math.round((value / max) * 100);

  return (
    <ProgramFigureRow
      ctx={ctx}
      label={textProp(node.props, "label")}
      figure={`${String(Math.round(value))} / ${String(Math.round(max))}`}
      figureMono
      body={
        <>
          <ProgressBar
            value={Math.max(0, Math.min(100, percent))}
            color={programProgressTone(tone)}
          />
          {caption === null ? null : (
            <T
              size="body"
              color={mutedText(ctx.t)}
              clamp={3}
              style={{ minWidth: 0 }}
            >
              {caption}
            </T>
          )}
        </>
      }
    />
  );
}

export function drawSparkline(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const values = listProp(node.props, "values")
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry));
  const tone = toneOfValue(node.props.tone);
  const label = textProp(node.props, "label");

  return (
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
      <AdwaitaSparkline
        values={values}
        color={programTextColor(ctx.t, tone === null ? "ink" : tone)}
        style={{ flexShrink: 0 }}
      />
      {label === "" ? null : (
        <T
          size="caption"
          color={mutedText(ctx.t)}
          clamp={2}
          style={{ minWidth: 0 }}
        >
          {label}
        </T>
      )}
    </div>
  );
}
