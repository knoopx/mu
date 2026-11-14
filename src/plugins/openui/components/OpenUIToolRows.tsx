/**
 * Drawing an OpenUI tool call in the log.
 *
 * The rows, chips, notes and the running block are core's; this file chooses
 * the words, the badge variants, and the one thing no other plugin's row does:
 * a render or a stream row *is* the screen, so it paints the live program from
 * the store and keeps painting it as later calls change it.
 */

import type { JSX } from "react";
import { useAdwaita, type BadgeVariant, type IconName } from "adwaita-gpuix";

import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";

import {
  ToolChips,
  ToolRunning,
  ToolStateNote,
  ToolStatusNote,
  ToolRowList,
  ToolSummary,
  ToolTruncated,
} from "../../core/components/ToolDataRows";
import { partsLine } from "../../core/lib/agent/toolText";
import {
  toolPreviewLine,
  type ToolPreviewVocabulary,
} from "../../core/lib/agent/toolPreview";
import {
  toolBodyStack,
  toolStatusIcon,
  toolStatusTone,
  type ToolPaintRow,
  type ToolRowTone,
} from "../../core/lib/ui/toolRowPaint";
import {
  NOT_DRAWN_NOTE,
  OPENUI_BADGE_VARIANTS,
  OPENUI_RENDER_TOOL,
  OPENUI_STATE_TOOL,
  OPENUI_STREAM_TOOL,
  OPENUI_TOOL_NAMES,
} from "../constants";
import type { OpenUIToolView } from "../types";
import { programStore } from "../lib/programStore/store";
import {
  openUIEmptyWords,
  openUIRunningWords,
  openUIToolViewOf,
} from "../lib/toolView";
import { ProgramScreen } from "./ProgramScreen";

const STATUS_TONES: Readonly<Record<string, ToolRowTone>> = {
  empty: "warn",
  unknown: "warn",
  open: "warn",
};

const STATUS_ICONS: Readonly<Record<string, IconName>> = {
  empty: "warning",
  unknown: "warning",
  open: "hourglass",
};

const WORDS: ToolPreviewVocabulary = {
  running: openUIRunningWords,
  runningDefault: "working with the screen",
  clean: ["empty"],
  empty: openUIEmptyWords,
  emptyDefault: "nothing to report",
  stated: {
    unknown: "no program by that name",
    failed: "the call was refused",
  },
};

export function isOpenUITool(name: string): boolean {
  return OPENUI_TOOL_NAMES.includes(name.toLowerCase());
}

const toneOf = (status: string): ToolRowTone =>
  toolStatusTone(status, STATUS_TONES);

/** The header line: which program, what the parse said, what waits. */
export const openUIToolPreviewOf = (item: ToolTranscriptItem): string =>
  toolPreviewLine(item, openUIToolViewOf(item), WORDS, headOf);

function headOf(tool: string, view: OpenUIToolView): string {
  const program = view.name === "" ? "" : view.name;
  if (tool === OPENUI_RENDER_TOOL || tool === OPENUI_STREAM_TOOL)
    return [program, view.headline].filter((part) => part !== "").join(" · ");
  if (view.headline === "") return program;
  return program === "" ? view.headline : `${program} · ${view.headline}`;
}

/** A program, as a row: what it holds and whether it is the showing one. */
const programRow = (
  program: OpenUIToolView["programs"][number],
): ToolPaintRow => ({
  key: program.name,
  primary: program.name,
  secondary: partsLine(
    `${String(program.statements)} statements`,
    `${String(program.components)} drawn`,
    program.streaming ? "streaming" : program.live ? "showing" : "idle",
    program.errors === 0 ? "" : `${String(program.errors)} errors`,
    program.waiting === 0 ? "" : `${String(program.waiting)} waiting`,
  ),
  badge: program.streaming ? "streaming" : program.live ? "showing" : "",
  tone: program.errors === 0 ? "neutral" : "warn",
});

/** A component of the library, as a row: its name and its arguments. */
const componentRow = (
  component: OpenUIToolView["components"][number],
): ToolPaintRow => ({
  key: component.name,
  primary: component.name,
  secondary:
    component.props.map((entry) => `${entry.name}: ${entry.type}`).join(", ") ||
    component.description,
  badge: component.group,
  tone: "neutral",
});

/** One parse or paint complaint. */
const diagnosticRow = (
  diagnostic: OpenUIToolView["diagnostics"][number],
  index: number,
): ToolPaintRow => ({
  key: `${diagnostic.code}-${String(index)}`,
  primary: diagnostic.component === "" ? diagnostic.path : diagnostic.component,
  secondary: diagnostic.message,
  badge: diagnostic.severity === "error" ? "error" : "warning",
  tone: diagnostic.severity === "error" ? "bad" : "warn",
});

/** One thing the human did to the screen. */
const eventRow = (
  event: OpenUIToolView["events"][number],
  index: number,
): ToolPaintRow => ({
  key: `event-${String(index)}`,
  primary: event.message === "" ? event.type : event.message,
  secondary: event.type,
  badge: "",
  tone: "neutral",
});

/** One `$variable` the screen holds. */
const valueRow = (value: OpenUIToolView["values"][number]): ToolPaintRow => ({
  key: value.name,
  primary: value.name,
  secondary: value.value,
  badge: "",
  tone: "neutral",
});

/** One name `openui-tools` served data under. */
const fixtureRow = (name: string): ToolPaintRow => ({
  key: name,
  primary: name,
  secondary: "served to Query",
  badge: "data",
  tone: "neutral",
});

/** A component the screen drew that the library list did not already name. */
const drawnRow = (component: string): ToolPaintRow => ({
  key: `drawn-${component}`,
  primary: component,
  secondary: "drawn",
  badge: "drawn",
  tone: "neutral",
});

/** The rows of one view, in the vocabulary core's row list paints. */
function rowsOf(view: OpenUIToolView): ToolPaintRow[] {
  const named = new Set(view.components.map((entry) => entry.name));
  return [
    ...view.programs.map(programRow),
    ...view.components.map(componentRow),
    ...view.diagnostics.map(diagnosticRow),
    ...view.events.map(eventRow),
    ...view.values.map(valueRow),
    ...view.names.map(fixtureRow),
    ...view.drawn.filter((name) => !named.has(name)).map(drawnRow),
  ];
}

const BADGE_VARIANTS: Readonly<Record<string, BadgeVariant>> = {
  ...OPENUI_BADGE_VARIANTS,
  data: "secondary",
  group: "secondary",
};

export function OpenUIToolRows(props: {
  item: ToolTranscriptItem;
}): JSX.Element {
  const t = useAdwaita();
  const view = openUIToolViewOf(props.item);

  if (view === null)
    return (
      <ToolStateNote icon="info" text={props.item.output} tone="neutral" />
    );

  if (props.item.status === "running")
    return (
      <ToolRunning
        text={
          openUIRunningWords[props.item.name.toLowerCase()] ??
          "working with the screen"
        }
      />
    );

  const rows = rowsOf(view);
  const tool = props.item.name.toLowerCase();
  const paints =
    (tool === OPENUI_RENDER_TOOL ||
      tool === OPENUI_STREAM_TOOL ||
      tool === OPENUI_STATE_TOOL) &&
    view.drawnProgram;
  // The row of the call that opened this program, but the store no longer holds
  // it: a session resumed from disk keeps its rows and loses its screens.
  const gone =
    (tool === OPENUI_RENDER_TOOL || tool === OPENUI_STREAM_TOOL) &&
    view.name !== "" &&
    !view.drawnProgram &&
    !programStore.has(view.name);

  return (
    <div style={toolBodyStack(t)}>
      <ToolChips cells={view.cells} />
      {view.status === "ok" ? null : (
        <ToolStatusNote
          status={view.status}
          note={view.headline}
          tones={STATUS_TONES}
          icons={STATUS_ICONS}
        />
      )}
      {view.headline === "" || view.status !== "ok" ? null : (
        <ToolSummary text={view.headline} tone={toneOf(view.status)} />
      )}
      {paints ? <ProgramScreen name={view.name} /> : null}
      {gone ? (
        <ToolStateNote
          icon="info"
          text={`${view.name}: ${NOT_DRAWN_NOTE}`}
          tone="neutral"
        />
      ) : null}
      {rows.length === 0 ? null : (
        <ToolRowList rows={rows} variants={BADGE_VARIANTS} pressable={false} />
      )}
      <ToolTruncated count={view.omitted} text="not shown — raise the limit" />
      {view.waiting === 0 || paints ? null : (
        <ToolStateNote
          icon={toolStatusIcon("open", STATUS_ICONS)}
          text={`${String(view.waiting)} interactions waiting — read them with openui-events`}
          tone="warn"
        />
      )}
    </div>
  );
}
