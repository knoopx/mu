/**
 * Draws a plot call in the transcript: the chart itself, what it measured, and —
 * when a value was not a number — the cells that were not.
 *
 * The chips, the notes and the running block are core's. This file owns two
 * things: the words a plot answer has that no other answer has, and the picture.
 * The picture is drawn from the plot's *data*, never from a cached bitmap, so it
 * wears the theme the window is wearing right now and a session resumed next week
 * still draws it.
 */

import type { JSX } from "react";
import {
  Chart as AdwaitaChart,
  ChartLegend,
  useAdwaita,
  type BadgeVariant,
  type IconName,
} from "adwaita-gpuix";

import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import { ToolCaptionLine } from "../../core/components/ToolCaptionLine";
import {
  ToolChips,
  ToolRowList,
  ToolRunning,
  ToolStatusNote,
  ToolSummary,
  ToolTruncated,
  ToolUnknownResult,
} from "../../core/components/ToolDataRows";
import {
  toolPreviewLine,
  type ToolPreviewVocabulary,
} from "../../core/lib/agent/toolPreview";
import {
  toolBodyStack,
  toolStatusTone,
  type ToolPaintRow,
  type ToolRowTone,
} from "../../core/lib/ui/toolRowPaint";
import { mutedText } from "../../core/lib/ui/theme";
import { CHART_RENDER_TOOL, MAX_READOUT_POINTS } from "../constants";
import {
  barWidthFor,
  legendOf,
  plotColor,
  plotDataOf,
  seriesColors,
} from "../lib/plot";
import { axisCell, chartFailureLine, chartToolViewOf } from "../lib/toolView";
import type { ChartToolView } from "../lib/toolView";

const RUNNING_TEXT: Record<string, string> = {
  [CHART_RENDER_TOOL]: "plotting the figures",
};

const EMPTY_TEXT: Record<string, string> = {
  [CHART_RENDER_TOOL]: "nothing to plot",
};

/** A plot answer's own words, so the header never has to guess. */
const CHART_WORDS: ToolPreviewVocabulary = {
  running: RUNNING_TEXT,
  runningDefault: "plotting the figures",
  clean: ["empty"],
  empty: EMPTY_TEXT,
  emptyDefault: "nothing to plot",
  stated: {},
};

const CHART_STATUS_TONES: Readonly<Record<string, ToolRowTone>> = {
  invalid: "bad",
  empty: "warn",
};

const CHART_STATUS_ICONS: Readonly<Record<string, IconName>> = {
  invalid: "error",
  empty: "info",
};

const CHART_BADGE_VARIANTS: Readonly<Record<string, BadgeVariant>> = {
  invalid: "destructive",
};

/** The plugin draws three figures, and each call is painted by its own rows. */
export function isChartTool(name: string): boolean {
  return name.toLowerCase() === CHART_RENDER_TOOL;
}

/** The tool header: what was plotted, over what span, and what fell off the cap. */
export const chartToolPreviewOf = (item: ToolTranscriptItem): string =>
  toolPreviewLine(
    item,
    chartToolViewOf(item.name, item.args, item.details, item.status),
    CHART_WORDS,
    headOf,
  );

function headOf(_tool: string, view: ChartToolView): string {
  const figure = view.figure;
  if (figure.status === "invalid") {
    return chartFailureLine(figure);
  }
  const axis = axisCell(figure);
  return [
    figure.kind,
    axis,
    figure.series.length === 0 ? "" : `${figure.series.length} series`,
  ]
    .filter((part) => part !== "")
    .join(" · ");
}

/** The cells a refusal could not read, as rows the log draws. */
function badRows(view: ChartToolView): ToolPaintRow[] {
  return view.figure.bad.slice(0, MAX_READOUT_POINTS).map((bad) => ({
    key: `p-${String(bad.at)}`,
    primary: `point ${String(bad.at + 1)}${bad.label === "" ? "" : ` · ${bad.label}`}`,
    secondary: `${bad.value === "" ? "(empty)" : bad.value} is not a number`,
    badge: "invalid",
    tone: "bad" as ToolRowTone,
  }));
}

export interface ChartToolRowsProps {
  item: ToolTranscriptItem;
}

export function ChartToolRows({ item }: ChartToolRowsProps): JSX.Element {
  const t = useAdwaita();

  if (item.status === "running") {
    return (
      <ToolRunning
        text={
          RUNNING_TEXT[item.name.toLowerCase()] ??
          RUNNING_TEXT[CHART_RENDER_TOOL]
        }
      />
    );
  }

  const view = chartToolViewOf(item.name, item.args, item.details, item.status);
  if (view === null) return <ToolUnknownResult item={item} tool={item.name} />;

  const { figure } = view;
  const tone = toolStatusTone(view.status, CHART_STATUS_TONES);
  const data = plotDataOf(figure);
  const legend = legendOf(figure, t);

  return (
    <div style={toolBodyStack(t)}>
      <ToolChips cells={view.cells} />

      {figure.status === "ok" ? (
        <AdwaitaChart
          data={data}
          type={figure.kind}
          color={plotColor(t, figure.tone)}
          colors={seriesColors(t)}
          barWidth={
            figure.kind === "line"
              ? undefined
              : barWidthFor(figure.plotted, figure.width)
          }
          height={figure.height}
          width={figure.width}
          grid={figure.grid}
          markers={figure.kind === "line" ? figure.markers : false}
          fill={figure.kind === "line" ? figure.fill : false}
          labels={figure.labels}
          dash={figure.dash ?? undefined}
          emphasis={figure.emphasis ?? undefined}
          style={{ width: "100%", minWidth: 0 }}
        />
      ) : null}

      {figure.status === "ok" && legend.length > 0 ? (
        <ChartLegend items={legend} style={{ paddingLeft: 0 }} />
      ) : null}

      {figure.caption === "" ? null : (
        <ToolCaptionLine color={mutedText(t)} text={figure.caption} />
      )}

      <ToolTruncated
        count={figure.omitted}
        text={`… ${String(figure.omitted)} more points not plotted — group the values or send the ones that matter`}
      />

      {figure.status === "invalid" ? (
        <>
          <ToolSummary text={chartFailureLine(figure)} tone={tone} />
          <ToolRowList
            rows={badRows(view)}
            variants={CHART_BADGE_VARIANTS}
            pressable={false}
          />
        </>
      ) : null}

      <ToolStatusNote
        status={view.status}
        note={figure.status === "ok" ? "" : figure.error}
        tones={CHART_STATUS_TONES}
        icons={CHART_STATUS_ICONS}
      />
    </div>
  );
}
