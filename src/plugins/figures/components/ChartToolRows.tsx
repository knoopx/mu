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
  ToolRowList,
  ToolRunning,
  ToolStatusNote,
  ToolUnknownResult,
} from "../../core/components/ToolDataRows";
import { counted } from "../../core/lib/agent/toolText";
import {
  headerLineOf,
  toolPreviewLine,
  type ToolPreviewVocabulary,
} from "../../core/lib/agent/toolPreview";
import {
  toolBodyStack,
  type ToolPaintRow,
  type ToolRowCell,
  type ToolRowTone,
} from "../../core/lib/ui/toolRowPaint";
import { mutedText } from "../../core/lib/ui/theme";
import { CHART_RENDER_TOOL, MAX_READOUT_POINTS } from "../constants";
import { legendOf, plotColor, plotDataOf, seriesColors } from "../lib/plot";
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
  empty: "warning",
};

const CHART_BADGE_VARIANTS: Readonly<Record<string, BadgeVariant>> = {
  invalid: "destructive",
};

/** The plugin draws three figures, and each call is painted by its own rows. */
export function isChartTool(name: string): boolean {
  return name.toLowerCase() === CHART_RENDER_TOOL;
}

/** The tool header: what was plotted, over what span, and what fell off the cap. */
/**
 * What the plot was drawn from: how many points were plotted, how many were left
 * out, the unit and the series. They are the call's own figures, so they ride its
 * header; the body is the plot.
 */
export function chartChipsOf(item: ToolTranscriptItem): readonly ToolRowCell[] {
  const view = chartToolViewOf(item.name, item.args, item.details, item.status);
  return view === null ? [] : view.cells;
}

export const chartToolPreviewOf = (item: ToolTranscriptItem): string =>
  toolPreviewLine(
    item,
    chartToolViewOf(item.name, item.args, item.details, item.status),
    CHART_WORDS,
    headOf,
  );

function headOf(_tool: string, view: ChartToolView): string {
  const figure = view.figure;
  // A refusal is said once, and the header is where it is said: on a plot the tool
  // never drew there is nothing else in the row that could carry the sentence, and
  // the body's job is to name the values that caused it.
  if (figure.status === "invalid") {
    return chartFailureLine(figure);
  }
  const axis = axisCell(figure);
  // What the plot left out rides the header with the rest of its counts, so the card
  // below holds the plot and its caption and nothing else.
  return headerLineOf(
    [
      figure.kind,
      axis,
      figure.series.length === 0 ? "" : `${figure.series.length} series`,
      // What the call says the plot is about is a line about the call, so it is said
      // here and not again under the picture.
      figure.caption,
    ]
      .filter((part) => part !== "")
      .join(" · "),
    [
      figure.omitted === 0
        ? ""
        : `… ${counted(figure.omitted, "point")} more not plotted`,
    ],
  );
}

/** The cells a refusal could not read, as rows the log draws. */
function badRows(view: ChartToolView): ToolPaintRow[] {
  return view.figure.bad.slice(0, MAX_READOUT_POINTS).map((bad) => ({
    key: `p-${String(bad.at)}`,
    // The cell the refusal is standing at, in the id column: `p-3` beside
    // `point 4 · Oct` says which cell of the input it is without naming the row twice.
    id: `p-${String(bad.at)}`,
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
  const data = plotDataOf(figure);
  const legend = legendOf(figure, t);

  return (
    <div style={toolBodyStack(t)}>
      {figure.status === "ok" ? (
        <AdwaitaChart
          data={data}
          type={figure.kind}
          color={plotColor(t, figure.tone)}
          colors={seriesColors(t)}
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

      {
        // Not the refusal again — the header already says it — but the values that
        // caused it, each in its own row with the cell it sat on.
        figure.status === "invalid" ? (
          <ToolRowList
            rows={badRows(view)}
            variants={CHART_BADGE_VARIANTS}
            pressable={false}
          />
        ) : null
      }

      <ToolStatusNote
        status={view.status}
        note={
          figure.status === "ok" || figure.status === "invalid"
            ? ""
            : figure.error
        }
        tones={CHART_STATUS_TONES}
        icons={CHART_STATUS_ICONS}
      />
    </div>
  );
}
