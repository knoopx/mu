/**
 * Drawing a openui tool call in the transcript.
 *
 * The row is core's — chips, a tally line, data rows, a state note — and this
 * file only supplies the words: what each tool is doing while it runs, what an
 * empty answer of each one means, and which badge a diagnostic wears. The one
 * thing no other plugin's row does is draw a program: the newest call that
 * pushed a name paints it live, so the human can read the screen the agent
 * built and operate it, and every older call for that name stays a record with
 * its own diagnostics.
 */

import type { JSX } from "react";
import { useAdwaita, type IconName } from "adwaita-gpuix";

import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import {
  ToolChips,
  ToolDataRow,
  ToolRunning,
  ToolSectionHead,
  ToolStateNote,
  ToolSummary,
  ToolUnknownResult,
} from "../../core/components/ToolDataRows";
import {
  toolPreviewLine,
  type ToolPreviewVocabulary,
} from "../../core/lib/agent/toolPreview";
import {
  toolBodyStack,
  toolStatusIcon,
  toolStatusTone,
  type ToolRowTone,
} from "../../core/lib/ui/toolRowPaint";
import {
  OPENUI_BADGE_VARIANTS,
  OPENUI_CLEAR_TOOL,
  OPENUI_EVENTS_TOOL,
  OPENUI_LIBRARY_TOOL,
  OPENUI_LIST_TOOL,
  OPENUI_PROMPT_TOOL,
  OPENUI_RENDER_TOOL,
  OPENUI_STATE_TOOL,
  OPENUI_STREAM_TOOL,
  OPENUI_SWITCH_TOOL,
  OPENUI_TOOLS_TOOL,
  OPENUI_TOOL_NAMES,
  OPENUI_VALIDATE_TOOL,
  OPENUI_WRITE_TOOLS,
} from "../constants";
import { useProgramOwner } from "../hooks/usePrograms";
import { openuiCellOf, openuiRowsOf, openuiToolViewOf } from "../lib/toolView";
import type { OpenuiToolStatus, OpenuiToolView } from "../types";
import { ProgramOutput } from "./ProgramOutput";

const RUNNING_TEXT: Record<string, string> = {
  [OPENUI_PROMPT_TOOL]: "writing the language reference",
  [OPENUI_LIBRARY_TOOL]: "reading the component library",
  [OPENUI_VALIDATE_TOOL]: "parsing the program",
  [OPENUI_RENDER_TOOL]: "putting a program in the log",
  [OPENUI_STREAM_TOOL]: "streaming a program into the log",
  [OPENUI_STATE_TOOL]: "reading what the renderer saw",
  [OPENUI_EVENTS_TOOL]: "reading what the human did",
  [OPENUI_TOOLS_TOOL]: "serving the program's data",
  [OPENUI_LIST_TOOL]: "reading the rendered programs",
  [OPENUI_SWITCH_TOOL]: "bringing a program to the front",
  [OPENUI_CLEAR_TOOL]: "taking programs out of the log",
};

const EMPTY_TEXT: Record<string, string> = {
  [OPENUI_LIST_TOOL]: "no program is rendered yet",
  [OPENUI_EVENTS_TOOL]: "no interaction yet",
  [OPENUI_STATE_TOOL]: "no program to read",
  [OPENUI_TOOLS_TOOL]: "no fixtures",
};

/** A status that answers in its own words whatever tool it belongs to. */
const STATED_STATUS: Readonly<Record<string, string>> = {
  "unknown-program": "no such program in the log",
  "no-program": "no program is rendered yet",
};

const PROGRAM_STATUS_TONES: Readonly<Record<string, ToolRowTone>> = {
  invalid: "warn",
  empty: "warn",
};

const PROGRAM_STATUS_ICONS: Readonly<Record<string, IconName>> = {
  invalid: "warning",
  empty: "warning",
};

const PROGRAM_WORDS: ToolPreviewVocabulary = {
  running: RUNNING_TEXT,
  runningDefault: "working in the log",
  clean: ["empty", "no-program"],
  empty: EMPTY_TEXT,
  emptyDefault: "nothing to show",
  stated: STATED_STATUS,
};

export function isOpenuiTool(name: string): boolean {
  return OPENUI_TOOL_NAMES.includes(name.toLowerCase());
}

const toneOf = (status: OpenuiToolStatus | ""): ToolRowTone =>
  toolStatusTone(status, PROGRAM_STATUS_TONES);

const iconOf = (status: OpenuiToolStatus | ""): IconName =>
  toolStatusIcon(status, PROGRAM_STATUS_ICONS);

/** The tool header: which program, how it parsed, and what what the log holds. */
export const openuiToolPreviewOf = (item: ToolTranscriptItem): string =>
  toolPreviewLine(
    item,
    openuiToolViewOf(item),
    PROGRAM_WORDS,
    headOf,
  );

function headOf(tool: string, view: OpenuiToolView): string {
  const parts = [view.program === "" ? "" : view.program];

  if (view.headline !== "") parts.push(view.headline);
  const components = openuiCellOf(view, "components");
  if (tool === OPENUI_LIBRARY_TOOL && components !== "")
    parts.push(`${components} components`);

  return parts.filter((part) => part !== "").join(" · ");
}

function OpenuiNote({ view }: { view: OpenuiToolView }): JSX.Element | null {
  if (view.note === "") return null;
  return (
    <ToolStateNote
      icon={iconOf(view.status)}
      tone={toneOf(view.status)}
      text={view.note}
    />
  );
}

function OpenuiHidden({ view }: { view: OpenuiToolView }): JSX.Element | null {
  if (view.hiddenErrors <= 0) return null;
  return (
    <ToolStateNote
      icon="unfoldMore"
      tone="neutral"
      text={`${String(view.hiddenErrors)} more diagnostics not shown — fix the first ones and re-send`}
    />
  );
}

function OpenuiSections({ view }: { view: OpenuiToolView }): JSX.Element[] {
  const t = useAdwaita();
  return view.sections.map((section, index) => (
    <div
      key={`${section.title || "rows"}-${String(index)}`}
      style={toolBodyStack(t)}
    >
      <ToolSectionHead text={section.title} />
      {section.rows.map((row, rowIndex) => (
        <ToolDataRow
          key={`${row.key}-${String(rowIndex)}`}
          row={row}
          first={rowIndex === 0}
          variants={OPENUI_BADGE_VARIANTS}
          pressable={false}
        />
      ))}
    </div>
  ));
}



function LiveProgram({ name }: { name: string }): JSX.Element {
  const t = useAdwaita();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        paddingTop: t.space.sm,
        paddingBottom: t.space.sm,
      }}
    >
      <ProgramOutput name={name} />
    </div>
  );
}

export interface OpenuiToolRowsProps {
  item: ToolTranscriptItem;
}

export function OpenuiToolRows({ item }: OpenuiToolRowsProps): JSX.Element {
  const t = useAdwaita();
  const tool = item.name.toLowerCase();
  const view = openuiToolViewOf(item);

  // Read before anything branches: only the newest call that rendered a program
  // paints it, and the log has to know that before it draws a row of its own.
  const owner = useProgramOwner(view?.program ?? "", item.toolCallId);

  if (item.status === "running")
    return <ToolRunning text={RUNNING_TEXT[tool] ?? "working in the log"} />;

  if (view === null) return <ToolUnknownResult item={item} tool={tool} />;

  const clean = view.status === "empty" || view.status === "no-program";
  const live = OPENUI_WRITE_TOOLS.includes(tool) && view.program !== "" && owner;

  return (
    <div style={toolBodyStack(t)}>
      <ToolChips cells={view.cells} />
      {clean ? null : <ToolSummary text={view.headline} tone={toneOf(view.status)} />}
      {live ? <LiveProgram name={view.program} /> : null}
      <OpenuiSections view={view} />
      <OpenuiHidden view={view} />
      <OpenuiNote view={view} />
    </div>
  );
}
