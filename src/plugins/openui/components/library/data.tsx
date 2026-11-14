/**
 * The data area of the language: the rows and figures a program shows.
 *
 * A `Table` is adwaita's `Table`, and the only table in the app: cells of text
 * in equal columns, one line to a row, rules between them. The agent has no
 * table tool — a table is drawn here, inside a screen the human operates.
 */

import type { JSX } from "react";
import { defineComponent, type ElementNode } from "@openuidev/lang-core";
import {
  Chart as AdwaitaChart,
  ChartLegend,
  DiffText,
  ProgressBar,
  SegmentBar,
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
  markersFor,
  plotColor,
  plotData,
  plotKindOf,
  plotToneOf,
  seriesColors,
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
import { readFileLines } from "../../lib/data/load";
import type { ProgramContext } from "./context";
import {
  ProgramFigureRow,
  ProgramSourceNote,
  listProp,
  programColumnStyle,
  programRowStyle,
  prop,
  sourceProp,
  textOf,
  textProp,
} from "./context";
import { cellText, isFigure, numberOf } from "./rows";

export const Table = defineComponent({
  name: "Table",
  description:
    "columns of text: a header row, then one row per item, each row a list of cells or an object of named fields; rows the file already holds are read with Load, not retyped",
  props: z.object({
    columns: z.array(z.union([z.string(), z.number()])),
    rows: z.array(z.any()),
    source: z.string().nullable().optional(),
  }),
  component: drawTable,
});

/** What a meter is asked for: the figure, the whole it is a part of, and the word for it. */
const meterProps = {
  label: z.union([z.string(), z.number()]),
  value: z.number(),
  max: z.number().nullable().optional(),
  tone: z.string().nullable().optional(),
};

export const Bar = defineComponent({
  name: "Bar",
  description:
    "a figure against its maximum, drawn as a fill: optionally weighted, with one line of its own under it",
  props: z.object({
    ...meterProps,

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
    'many values on one canvas: bars across a category axis, or a line with markers and a fill — `Chart("bar", labels, series)` where series is a list of numbers or {name: numbers}',
  props: z.object({
    type: z.enum(["bar", "line", "area"]).nullable().optional(),
    labels: z.array(z.any()).nullable().optional(),
    series: z.any().nullable().optional(),
    unit: z.string().nullable().optional(),
    source: z.string().nullable().optional(),

    /** mu's own shape, still read: `[label, v1, v2]` per point. */
    points: z.array(z.any()).nullable().optional(),

    /** Names for the series, in the order their values sit in each point. */
    seriesNames: z
      .array(z.union([z.string(), z.number()]))
      .nullable()
      .optional(),

    kind: z.enum(["bar", "line"]).nullable().optional(),
    height: z.number().nullable().optional(),
    width: z.number().nullable().optional(),
    grid: z.boolean().nullable().optional(),
    markers: z.boolean().nullable().optional(),
    fill: z.boolean().nullable().optional(),
    /** mu's own toggle for the axis names; `labels` itself is the list of them. */
    showLabels: z.boolean().nullable().optional(),
    tone: z.string().nullable().optional(),

    /** Break the line into dashes: a planned run, not a measured one. */
    dash: z.number().nullable().optional(),

    /** Which point the reader is standing at — now, the end, the selected row. */
    emphasis: z.number().nullable().optional(),
  }),
  component: drawChart,
});

/* ------------------------------------------------------------------ draws */

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
   * adwaita's table, not a column of divs dressed as one: one line per row (its
   * `compact` row height is core's `ROW_HEIGHT`), a rule between rows, a header
   * divided from what it names, and no box drawn around a block that already
   * sits inside a pane — `frame="bare"`, because a framed table inside a framed
   * pane is one box drawn twice.
   *
   * The two bands carry their own key. A `Table` measures its columns across
   * every row and then hands back a rebuilt tree, and a rebuilt tree is a
   * dynamic list to React even where it was written as static JSX children — so
   * a band that arrives with no key is a list item with no identity, and React
   * says so from inside `Table`. A key written here is the one the rebuild keeps.
   */
  const table = (
    <AdwaitaTable
      density="compact"
      frame="bare"
      style={{ width: "100%", minWidth: 0 }}
    >
      {columns.length === 0 ? null : (
        <TableHeader key="header">
          {columns.map((column, index) => (
            <TableHead key={`h-${column}-${String(index)}`}>{column}</TableHead>
          ))}
        </TableHeader>
      )}
      <TableBody key="body">
        {rows.map((row, rowIndex) => (
          <TableRow key={`r-${String(rowIndex)}`}>
            {rowCellsOf(row, columns)
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

  const source = sourceProp(node.props);
  if (source === "") return table;
  return (
    <div style={programColumnStyle(ctx.t)}>
      {table}
      <ProgramSourceNote ctx={ctx} source={source} />
    </div>
  );
}

/**
 * The rows of a `Table`, whether the program wrote them as cells or as fields.
 *
 * A `Load`ed CSV arrives as objects keyed by its header row, and a program that
 * names `columns` then expects those keys to be read — which a positional read
 * of an object row would miss. So a row is read by its column name when it is an
 * object, and by its place when it is a list.
 */
export function rowCellsOf(row: unknown, columns: readonly string[]): unknown[] {
  if (Array.isArray(row)) return row;
  if (typeof row === "object" && row !== null) {
    const record = row as Record<string, unknown>;
    return columns.map((column, index) => {
      const named = record[column];
      if (named !== undefined) return named;
      const lowered = Object.keys(record).find(
        (key) => key.toLowerCase() === String(column).toLowerCase(),
      );
      return lowered === undefined ? record[index] : record[lowered];
    });
  }
  return [row];
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

/**
 * The points of a `Chart`, in whichever shape the program wrote them.
 *
 * The reference says `Chart("bar", labels, series)`, where a series is a list of
 * numbers or an object of series name to a list of numbers; mu's own programs
 * wrote each point as `[label, v1, v2]`. Both arrive here as the same list of
 * points, so the plot, its column budget and its series ramp stay one thing
 * whichever shape a program used.
 */
function chartPointsOf(node: ElementNode): unknown[] {
  const given = node.props.points;
  if (Array.isArray(given)) return given;

  const labels = listProp(node.props, "labels").map(cellText);
  const spec = node.props.series;

  const linesOf = (value: unknown): number[] =>
    (Array.isArray(value) ? value : []).map((entry) => numberOf(entry));

  const lines: { name: string; values: number[] }[] = Array.isArray(spec)
    ? [{ name: "", values: linesOf(spec) }]
    : spec !== null && typeof spec === "object"
      ? Object.entries(spec as Record<string, unknown>).map(([name, values]) => ({
          name,
          values: linesOf(values),
        }))
      : [];

  const height = Math.max(
    labels.length,
    ...lines.map((line) => line.values.length),
    0,
  );
  if (height === 0) return [];

  return Array.from({ length: height }, (_, index) => [
    labels[index] ?? String(index + 1),
    ...lines.map((line) => line.values[index] ?? 0),
  ]);
}

/** The names of a `Chart`'s series, from the object the program handed. */
function chartSeriesNamesOf(node: ElementNode): string[] {
  const named = listProp(node.props, "seriesNames").map(cellText);
  if (named.length > 0) return named;
  const spec = node.props.series;
  if (spec !== null && typeof spec === "object" && !Array.isArray(spec))
    return Object.keys(spec as Record<string, unknown>);
  return [];
}

export function drawChart(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const word = textProp(node.props, "type") === "" ? textProp(node.props, "kind") : textProp(node.props, "type");
  const kind = plotKindOf(word);
  const read = coercePlot(chartPointsOf(node));
  const capped = capPlot(read.points, MAX_POINTS);
  const width = prop<number>(node.props, "width", CHART_CANVAS_WIDTH);
  const emphasis = prop<number | null>(node.props, "emphasis", null);
  const line = kind === "line";
  const area = word.trim().toLowerCase() === "area";
  const unit = textProp(node.props, "unit");
  const source = sourceProp(node.props);
  const note = source === "" ? unit : unit === "" ? source : `${unit} · ${source}`;

  const series = seriesNamesOf(
    chartSeriesNamesOf(node),
    { ...read, points: capped.points },
  );

  return (
    <div style={programColumnStyle(ctx.t)}>
      <AdwaitaChart
        data={plotData(capped.points, series)}
        type={kind}
        color={plotColor(ctx.t, plotToneOf(node.props.tone))}
        colors={seriesColors(ctx.t)}
        height={prop<number>(node.props, "height", CHART_HEIGHT)}
        width={width}
        grid={prop(node.props, "grid", false)}
        markers={
          line
            ? markersFor(
                prop<boolean | null>(node.props, "markers", null) ?? undefined,
                capped.points.length,
                emphasis,
              )
            : false
        }
        fill={line ? (area || prop(node.props, "fill", false)) : false}
        labels={
          typeof node.props.labels === "boolean"
            ? node.props.labels
            : prop(node.props, "showLabels", true)
        }
        dash={prop<number | null>(node.props, "dash", null) ?? undefined}
        emphasis={emphasis ?? undefined}
        style={{ width: "100%", minWidth: 0 }}
      />
      {series.length === 0 ? null : (
        <ChartLegend items={seriesLegend(series, ctx.t)} />
      )}
      <ProgramSourceNote ctx={ctx} source={note} />
    </div>
  );
}

/**
 * The meter under a figure: how far the run has got, and the line that says why.
 *
 * A `Bar` and a `Progress` are the same two things standing under their own head
 * — only the figure's format and the cap differ — so the fill and its caption are
 * drawn once, and a measure taken out of one is taken out of both.
 */
function MeterBody(props: {
  ctx: ProgramContext;
  percent: number;
  tone: ProgramTone | null;
  caption: string | null;
}): JSX.Element {
  return (
    <>
      <ProgressBar
        value={Math.max(0, Math.min(100, props.percent))}
        color={programProgressTone(props.tone)}
      />
      {props.caption === null ? null : (
        <T
          size="body"
          color={mutedText(props.ctx.t)}
          clamp={3}
          style={{ minWidth: 0 }}
        >
          {props.caption}
        </T>
      )}
    </>
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
        <MeterBody ctx={ctx} percent={percent} tone={tone} caption={caption} />
      }
    />
  );
}

/* ------------------------------------------------------- progress, series */

/** How far a run has got, said as its own figure rather than as a meter beside one. */
export const Progress = defineComponent({
  name: "Progress",
  description:
    "how far something has got: how much is done, the whole it is a part of (100 when the program says no maximum), then its label",
  props: z.object({
    value: z.number(),
    max: z.number().nullable().optional(),
    label: z.union([z.string(), z.number()]).nullable().optional(),
    tone: z.string().nullable().optional(),
    caption: z.string().nullable().optional(),
  }),
  component: drawProgress,
});

/**
 * A level against a range.
 *
 * The reference draws a dial. mu has no dial to paint, and inventing one would
 * be a second meter the app's own panels do not have, so a gauge is drawn the
 * way the app already says _level_: the figure over a track that shows how much
 * of the range is taken and how much is left. What a program asks for is the
 * same in either case.
 */
export const Gauge = defineComponent({
  name: "Gauge",
  description:
    "a level against a range: its value, its bounds (0 to 100 when the program says none), its label, and the word for how good it looks",
  props: z.object({
    value: z.number(),
    min: z.number().nullable().optional(),
    max: z.number().nullable().optional(),
    label: z.union([z.string(), z.number()]).nullable().optional(),
    tone: z.string().nullable().optional(),
  }),
  component: drawGauge,
});

/**
 * Code from a file, at the lines the program asked for.
 *
 * The reference's rule is blunt and right: code is quoted from the file, never
 * pasted. So a `Snippet` reads the file the same way every other read of a
 * program's file does — inside the window's folder, bounded — and prints the
 * lines it names with their numbers beside them.
 */
export const Snippet = defineComponent({
  name: "Snippet",
  description:
    "lines of a file this project holds, 1-based: its path, then the first and last line — never paste code a file already holds",
  props: z.object({
    path: z.string(),
    from: z.number().nullable().optional(),
    to: z.number().nullable().optional(),
  }),
  component: drawSnippet,
});

/** One file's change, as the patch says it. */
export const Diff = defineComponent({
  name: "Diff",
  description: "a unified diff of one file, drawn the way the app's own change previews draw it",
  props: z.object({
    patch: z.string(),
  }),
  component: drawDiff,
});

/** The shape of a series, with no axes to read: a sparkline under a metric, a trend beside a figure. */
export const Sparkline = defineComponent({
  name: "Sparkline",
  description:
    "a run of numbers drawn as one small line: the shape of a series, with no axes to read",
  props: z.object({
    values: z.array(z.any()),
    tone: z.string().nullable().optional(),
    label: z.union([z.string(), z.number()]).nullable().optional(),
  }),
  component: drawSparkline,
});

export function drawProgress(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  // A mu program wrote `Progress("Tests", 3, 10)` — the label first. The
  // reference puts the figure first; a string in that slot is the older order.
  const legacy = typeof node.props.value === "string";
  const value = legacy
    ? numberOf(node.props.max)
    : numberOf(node.props.value);
  const max = legacy
    ? numberOf(node.props.label, 100)
    : numberOf(node.props.max, 100);
  const label = legacy ? textProp(node.props, "value") : textProp(node.props, "label");
  const tone = toneOfValue(node.props.tone);
  const caption = textOf(node.props.caption);
  const percent = max <= 0 ? 0 : Math.round((value / max) * 100);

  return (
    <ProgramFigureRow
      ctx={ctx}
      label={label}
      figure={`${String(Math.round(value))} / ${String(Math.round(max))}`}
      figureMono
      body={
        <MeterBody ctx={ctx} percent={percent} tone={tone} caption={caption} />
      }
    />
  );
}

export function drawGauge(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const min = numberOf(node.props.min, 0);
  const max = numberOf(node.props.max, 100);
  const value = numberOf(node.props.value);
  const tone = toneOfValue(node.props.tone);
  const span = max - min;
  const taken = span <= 0 ? 0 : Math.max(0, Math.min(1, (value - min) / span));

  return (
    <ProgramFigureRow
      ctx={ctx}
      label={textProp(node.props, "label")}
      figure={`${String(Math.round(value * 100) / 100)} / ${String(Math.round(max))}`}
      figureMono
      figureColor={programTextColor(ctx.t, tone === null ? "ink" : tone)}
      body={
        <SegmentBar
          segments={[
            {
              value: taken,
              color: programTextColor(ctx.t, tone === null ? "accent" : tone),
            },
          ]}
          tail={Math.max(0, 1 - taken)}
          style={{ width: "100%", minWidth: 0 }}
        />
      }
    />
  );
}

/** How many lines of a file a `Snippet` will print, however wide the program asked for. */
const SNIPPET_MAX_LINES = 80;

export function drawSnippet(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const path = textProp(node.props, "path");
  const from = Math.max(1, numberOf(node.props.from, 1));
  const asked = numberOf(node.props.to, from + SNIPPET_MAX_LINES - 1);
  const to = Math.min(asked, from + SNIPPET_MAX_LINES - 1);
  const read = readFileLines(process.cwd(), path, from, to);

  if (!read.ok)
    return (
      <T
        size="caption"
        color={programTextColor(ctx.t, "warning")}
        clamp={3}
        style={{ minWidth: 0 }}
      >
        {`Snippet("${path}"): ${read.error}`}
      </T>
    );

  const gutter = String(read.last).length;

  return (
    <div
      style={{
        ...programColumnStyle(ctx.t),
        gap: 0,
        padding: innerGap(ctx.t),
        borderRadius: ctx.t.radius.sm,
        backgroundColor: ctx.t.color.surface.sunken,
      }}
    >
      <T
        size="caption"
        color={mutedText(ctx.t)}
        clamp={1}
        style={{ minWidth: 0, fontFamily: ctx.t.type.fontFamilyMono }}
      >
        {`${path}${read.total > read.last ? ` · ${String(read.total)} lines` : ""}`}
      </T>
      {read.lines.map((line, index) => (
        <div
          key={`s-${String(read.first + index)}`}
          style={{ ...programRowStyle(ctx.t), gap: innerGap(ctx.t), alignItems: "start" }}
        >
          <T
            size="caption"
            color={mutedText(ctx.t)}
            clamp={1}
            align="right"
            style={{
              flexShrink: 0,
              fontFamily: ctx.t.type.fontFamilyMono,
              whiteSpace: "nowrap",
            }}
          >
            {String(read.first + index).padStart(gutter, " ")}
          </T>
          <T
            size="caption"
            color={ctx.t.color.text.primary}
            clamp={1}
            style={{
              flexGrow: 1,
              flexBasis: 0,
              minWidth: 0,
              fontFamily: ctx.t.type.fontFamilyMono,
              whiteSpace: "nowrap",
            }}
          >
            {line === "" ? " " : line}
          </T>
        </div>
      ))}
    </div>
  );
}

export function drawDiff(node: ElementNode, ctx: ProgramContext): JSX.Element {
  return (
    <DiffText
      patch={textProp(node.props, "patch")}
      scroll={false}
      style={{ width: "100%", minWidth: 0 }}
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
    <div style={{ ...programRowStyle(ctx.t), width: "100%" }}>
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
