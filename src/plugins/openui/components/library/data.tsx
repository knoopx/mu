import { defineComponent } from "@openuidev/react-lang";
import { z } from "zod";
import {
  Chart as AdwChart,
  ProgressBar,
  Table as AdwTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  T,
  useAdwaita,
  type ChartData,
} from "adwaita-gpuix";
import { TONE_TOKENS, fraction, type ToneToken } from "../../lib/tokens";
import { toneColor } from "../../lib/theme";

const CELL_ALIGN = ["left", "right", "center"] as const;
type CellAlign = (typeof CELL_ALIGN)[number];


const SPAN_MIN = 4;
const SPAN_MAX = 18;

function cellText(cell: unknown): string {
  if (cell == null) return "";
  if (typeof cell === "object") {
    const node = cell as { typeName?: string; props?: Record<string, unknown> };
    const text = node.props?.label ?? node.props?.title ?? node.props?.text;
    return typeof text === "string" ? text : (node.typeName ?? "");
  }
  return String(cell);
}


function columnSpan(label: string, data: unknown[]): number {
  const widths = [label, ...data.map(cellText)].map((text) => text.length);
  return Math.max(SPAN_MIN, Math.min(SPAN_MAX, Math.max(0, ...widths)));
}



function columnStyle(span: number) {
  return { flexGrow: span, flexShrink: 1, flexBasis: 0, minWidth: 0 };
}

export const Col = defineComponent({
  name: "Col",
  props: z.object({
    label: z.string().describe("Column header."),
    data: z
      .array(z.any())
      .describe("Cell values, top to bottom. Numbers, strings, or components."),
    align: z
      .enum(CELL_ALIGN)
      .optional()
      .describe('Cell alignment; "right" for a column of numbers (default "left").'),
  }),
  description:
    "Table column: a header plus one value per row, `align: \"right\"` for numbers. Used only inside Table.",
  component: () => null,
});

export const Table = defineComponent({
  name: "Table",
  props: z.object({
    columns: z.array(Col.ref).describe("One Col per column."),
  }),
  description:
    "Column-oriented data table, flush on the view surface: dim header, aligned column edges down the page, no outer frame, no zebra. Table([Col(\"Name\", [..]), Col(\"Qty\", [..], \"right\")]). Cells may be components.",
  component: ({ props, renderNode }) => {
    const cols = (props.columns ?? [])
      .filter((c) => c && c.props)
      .map((c) => {
        const label = String(c.props?.label ?? "");
        const data = Array.isArray(c.props?.data) ? (c.props.data as unknown[]) : [];
        return {
          label,
          data,
          align: (CELL_ALIGN as readonly string[]).includes(String(c.props?.align))
            ? (c.props?.align as CellAlign)
            : undefined,
          span: columnSpan(label, data),
        };
      });
    if (!cols.length) return null;
    const rows = Math.max(...cols.map((c) => c.data.length), 0);
    return (
      <AdwTable style={{ width: "100%" }}>
        <TableHeader>
          <TableRow>
            {cols.map((c, i) => (
              <TableHead key={i} align={c.align} style={columnStyle(c.span)}>
                {c.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, r) => (
            <TableRow key={r}>
              {cols.map((c, ci) => {
                const cell = c.data[r];
                return (
                  <TableCell key={ci} align={c.align} style={columnStyle(c.span)}>
                    {cell != null && typeof cell === "object"
                      ? renderNode(cell)
                      : String(cell ?? "")}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </AdwTable>
    );
  },
});

export const ListItem = defineComponent({
  name: "ListItem",
  props: z.object({
    title: z.string().describe("Primary line."),
    subtitle: z.string().optional().describe("Secondary line."),
    trailing: z.any().optional().describe("Right-aligned child (e.g. a Tag)."),
  }),
  description: "One row of a ListBlock. Used only inside ListBlock.",
  component: ({ props, renderNode }) => <Row2 {...props} renderNode={renderNode} />,
});

function Row2({
  title,
  subtitle,
  trailing,
  renderNode,
}: {
  title: string;
  subtitle?: unknown;
  trailing?: unknown;
  renderNode: (v: unknown) => React.ReactNode;
}) {
  const t = useAdwaita();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        width: "100%",
        padding: 8,
        borderRadius: t.radius.xs,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          flexGrow: 1,
          minWidth: 0,
        }}
      >
        <T size="body" color={t.color.text.primary} clamp={1}>
          {title}
        </T>
        {typeof subtitle === "string" && subtitle ? (
          <T size="caption" color={t.color.text.dim} clamp={2}>
            {subtitle}
          </T>
        ) : null}
      </div>
      {trailing != null ? (
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "row", gap: 6 }}>
          {renderNode(trailing)}
        </div>
      ) : null}
    </div>
  );
}

export const ListBlock = defineComponent({
  name: "ListBlock",
  props: z.object({
    items: z.array(ListItem.ref).describe("Rows, in order."),
    emptyLabel: z.string().optional().describe("Shown when there are no items."),
  }),
  description:
    "One continuous list of ListItem rows on the view surface — no panel, no per-row tile.",
  component: ({ props, renderNode }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        width: "100%",
      }}
    >
      {props.items?.length
        ? renderNode(props.items)
        : (() => {
            const t = useAdwaita();
            return (
              <T size="caption" color={t.color.text.dim}>
                {props.emptyLabel ?? "No items"}
              </T>
            );
          })()}
    </div>
  ),
});

const looseList = z.array(z.any());


interface ChartArgs {
  data?: unknown[];
  labels?: unknown[];
  series?: unknown[];
}

interface ChartPoint {
  label: string;
  value: number;
}

interface ChartSeries {
  category: string;
  values: number[];
}


interface ChartBuckets {
  points: ChartPoint[];
  labels: string[];
  series: ChartSeries[];
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const entryValue = (entry: Record<string, unknown>): unknown =>
  entry.value ?? entry.y ?? entry.amount ?? entry.count;

const entryLabel = (entry: Record<string, unknown>): unknown =>
  entry.label ?? entry.category ?? entry.name ?? entry.x;


function seriesOf(entry: Record<string, unknown>, index: number): ChartSeries | undefined {
  if (!Array.isArray(entry.values)) return undefined;
  return {
    category: String(entry.category ?? entry.name ?? `series ${index + 1}`),
    values: entry.values.map(asNumber),
  };
}


function pointOf(entry: Record<string, unknown>, index: number): ChartPoint | undefined {
  const rawValue = entryValue(entry);
  if (rawValue === undefined) return undefined;
  return { label: String(entryLabel(entry) ?? index + 1), value: asNumber(rawValue) };
}


function collectItem(item: unknown, buckets: ChartBuckets): void {
  if (item == null) return;
  if (typeof item === "number") {
    buckets.points.push({ label: String(buckets.points.length + 1), value: item });
    return;
  }
  if (typeof item === "string") {
    buckets.labels.push(item);
    return;
  }
  if (typeof item !== "object") return;
  const entry = item as Record<string, unknown>;
  const series = seriesOf(entry, buckets.series.length);
  if (series !== undefined) {
    buckets.series.push(series);
    return;
  }
  const point = pointOf(entry, buckets.points.length);
  if (point !== undefined) buckets.points.push(point);
}

function chartBuckets(input: ChartArgs): ChartBuckets {
  const buckets: ChartBuckets = { points: [], labels: [], series: [] };
  for (const bucket of [input.data ?? [], input.labels ?? [], input.series ?? []])
    for (const item of bucket) collectItem(item, buckets);
  return buckets;
}


function chartDataOf(buckets: ChartBuckets): ChartData {
  if (buckets.series.length > 0) {
    const axis = buckets.labels.length > 0 ? buckets.labels : buckets.points.map((p) => p.label);
    return axis.map((label, i) => ({
      label,
      values: buckets.series.map((s) => ({ name: s.category, value: s.values[i] ?? 0 })),
    })) as unknown as ChartData;
  }
  if (buckets.points.length === 0 && buckets.labels.length > 0)
    return buckets.labels.map((label) => ({ label, value: 0 })) as unknown as ChartData;
  return buckets.points as unknown as ChartData;
}

function toChartData(input: ChartArgs): ChartData {
  return chartDataOf(chartBuckets(input));
}

export const BarChart = defineComponent({
  name: "BarChart",
  props: z.object({
    data: looseList.optional().describe('Points, one bar each: [{ label: "api", value: 412 }, …] — object literals use colons.'),
    labels: looseList.optional().describe("Category axis: [\"Mon\", \"Tue\", …], paired with series."),
    series: looseList.optional().describe('Named series: [{ category: "api", values: [1, 2] }, …].'),
    height: z.number().optional().describe("Plot height in px (default 220)."),
  }),
  description:
    "Vertical bars. BarChart([{label, value}, …]) for one series; BarChart(labels, [{category, values}, …]) to compare series. Object literals use colons, not equals.",
  component: ({ props }) => (
    <AdwChart
      type="bar"
      data={toChartData(props)}
      height={props.height ?? 220}
      style={{ width: "100%" }}
    />
  ),
});

export const LineChart = defineComponent({
  name: "LineChart",
  props: z.object({
    data: looseList.optional().describe('Samples, one per x: [{ label: "Mon", value: 12 }, …] — object literals use colons.'),
    labels: looseList.optional().describe("X axis: [\"Mon\", \"Tue\", …], paired with series."),
    series: looseList.optional().describe('Named series: [{ category: "sessions", values: [1, 2] }, …].'),
    height: z.number().optional().describe("Plot height in px (default 220)."),
    markers: z.boolean().optional().describe("Draw a marker per point."),
  }),
  description:
    "Line chart for trends over an ordered axis. LineChart([{label, value}, …]) or LineChart(labels, [{category, values}, …]). Object literals use colons, not equals.",
  component: ({ props }) => (
    <AdwChart
      type="line"
      data={toChartData(props)}
      markers={props.markers}
      height={props.height ?? 220}
      style={{ width: "100%" }}
    />
  ),
});

export const Progress = defineComponent({
  name: "Progress",
  props: z.object({
    label: z.string().optional().describe("Caption above the bar."),
    value: z.number().describe("Current value."),
    max: z
      .number()
      .optional()
      .describe("Upper bound. Defaults to 1 for fractions, 100 for larger values."),
    tone: z
      .enum(TONE_TOKENS)
      .optional()
      .describe("Bar colour tone (default accent)."),
  }),
  description: "Progress bar. Progress(\"Uploading\", 0.42) or Progress(\"Load\", 72, 100).",
  component: ({ props }) => {
    const t = useAdwaita();
    const ratio = fraction(props.value, props.max);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
        {props.label ? (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              width: "100%",
              justifyContent: "space-between",
            }}
          >
            <T size="caption" color={t.color.text.dim}>
              {props.label}
            </T>
            <T
              size="caption"
              color={toneColor(t, props.tone as ToneToken)}
              weight={600}
              style={{ whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {Math.round(ratio * 100)}%
            </T>
          </div>
        ) : null}
        <ProgressBar
          value={ratio * 100}
          color={
            props.tone === "destructive"
              ? "destructive"
              : props.tone === "success"
                ? "success"
                : props.tone === "warning"
                  ? "warning"
                  : "accent"
          }
          style={{ width: "100%" }}
        />
      </div>
    );
  },
});

export const Chart = defineComponent({
  name: "Chart",
  props: z.object({
    rows: z
      .array(z.any())
      .describe("Rows of data as object literals: [{ month: \"Jan\", sales: 12, cost: 7 }, …]"),
    x: z.string().describe("Key holding the category or time label."),
    series: z
      .array(z.string())
      .optional()
      .describe("Value keys to plot (default: every numeric key)."),
    kind: z
      .enum(["bar", "line"])
      .optional()
      .describe('"bar" to compare, "line" for a trend (default "bar").'),
    height: z.number().optional().describe("Plot height in px (default 240)."),
  }),
  description:
    "One chart for many series: pass rows plus the x key and the series keys. Use BarChart/LineChart for the simple label/value case.",
  component: ({ props }) => {
    const rows = (props.rows ?? []) as Record<string, unknown>[];
    const first = rows[0] ?? {};
    const numeric = Object.keys(first).filter(
      (key) => key !== props.x && typeof first[key] === "number",
    );
    const series = props.series && props.series.length > 0 ? props.series : numeric;
    const data = rows.map((row) => ({
      label: String(row[props.x] ?? ""),
      values: series.map((key) => ({
        name: key,
        value: Number(row[key] ?? 0) || 0,
      })),
    }));
    return (
      <AdwChart
        data={data as unknown as ChartData}
        type={props.kind === "line" ? "line" : "bar"}
        height={props.height ?? 240}
        style={{ width: "100%" }}
      />
    );
  },
});
