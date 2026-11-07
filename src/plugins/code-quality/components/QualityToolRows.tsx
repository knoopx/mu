/**
 * Draws a code-quality tool call in the transcript: what was analysed, what
 * the analyser found, and the rows it ranked worst first. The rows, chips,
 * meters and the running block are core's — this file only says which tool is
 * running, what each of its empty answers reads as, and which badges a finding
 * wears.
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
  CODE_COMPLEXITY_TOOL,
  CODE_DEAD_CODE_TOOL,
  CODE_DUPLICATES_TOOL,
  CODE_QUALITY_TOOL_NAMES,
  CODE_REVIEW_TOOL,
  CODE_SYMBOL_INSPECT_TOOL,
  CODE_SYMBOL_REFERENCES_TOOL,
  QUALITY_BADGE_VARIANTS,
} from "../constants";
import { qualityCellOf, qualityRowsOf, qualityToolViewOf } from "../lib/toolView";
import type { QualityToolStatus, QualityToolView } from "../types";

const RUNNING_TEXT: Record<string, string> = {
  [CODE_COMPLEXITY_TOOL]: "measuring complexity",
  [CODE_DEAD_CODE_TOOL]: "looking for unused code",
  [CODE_DUPLICATES_TOOL]: "comparing code for clones",
  [CODE_REVIEW_TOOL]: "scoring the change",
  [CODE_SYMBOL_INSPECT_TOOL]: "reading the file's surface",
  [CODE_SYMBOL_REFERENCES_TOOL]: "tracing who calls what",
};

const EMPTY_TEXT: Record<string, string> = {
  [CODE_COMPLEXITY_TOOL]: "nothing over the thresholds",
  [CODE_DEAD_CODE_TOOL]: "nothing unused",
  [CODE_DUPLICATES_TOOL]: "no clones",
  [CODE_REVIEW_TOOL]: "no entities changed",
  [CODE_SYMBOL_INSPECT_TOOL]: "no exports",
  [CODE_SYMBOL_REFERENCES_TOOL]: "no call chain",
};

const SCOPE_LABELS: Record<string, string> = {
  [CODE_COMPLEXITY_TOOL]: "scope",
  [CODE_DEAD_CODE_TOOL]: "scope",
  [CODE_DUPLICATES_TOOL]: "scope",
  [CODE_REVIEW_TOOL]: "target",
  [CODE_SYMBOL_INSPECT_TOOL]: "file",
  [CODE_SYMBOL_REFERENCES_TOOL]: "symbol",
};

/** A status that answers in its own words whatever tool it belongs to. */
const STATED_STATUS: Readonly<Record<string, string>> = {
  unsupported: "no analyser available",
};


/** An empty result is worth a warning; a clean one is not. */
const QUALITY_STATUS_TONES: Readonly<Record<string, ToolRowTone>> = {
  empty: "warn",
};

const QUALITY_STATUS_ICONS: Readonly<Record<string, IconName>> = {
  empty: "warning",
};

/** What the six analyser tools say about themselves, in their own words. */
const QUALITY_WORDS: ToolPreviewVocabulary = {
  running: RUNNING_TEXT,
  runningDefault: "reading the project",
  clean: ["empty", "none"],
  empty: EMPTY_TEXT,
  emptyDefault: "nothing found",
  stated: STATED_STATUS,
};

export function isCodeQualityTool(name: string): boolean {
  return CODE_QUALITY_TOOL_NAMES.includes(name.toLowerCase());
}

const toneOf = (status: QualityToolStatus | ""): ToolRowTone =>
  toolStatusTone(status, QUALITY_STATUS_TONES);

const iconOf = (status: QualityToolStatus | ""): IconName =>
  toolStatusIcon(status, QUALITY_STATUS_ICONS);

/** The tool header: what ran, what it counted, and the scope it was pointed at. */
export const qualityToolPreviewOf = (item: ToolTranscriptItem): string =>
  toolPreviewLine(
    item,
    qualityToolViewOf(item.name, item.args, item.details, item.status),
    QUALITY_WORDS,
    headOf,
  );

function headOf(tool: string, view: QualityToolView): string {
  const scope = qualityCellOf(view, SCOPE_LABELS[tool] ?? "scope");
  const rows = qualityRowsOf(view).length;
  const parts = [scope];

  if (view.headline !== "") parts.push(view.headline);
  if (tool === CODE_SYMBOL_REFERENCES_TOOL && view.headline === "")
    parts.push(`${String(rows)} edges`);

  return parts.filter((part) => part !== "").join(" · ");
}

function QualityNote({ view }: { view: QualityToolView }): JSX.Element | null {
  if (view.note === "") return null;
  return (
    <ToolStateNote
      icon={iconOf(view.status)}
      tone={toneOf(view.status)}
      text={view.note}
    />
  );
}

function QualityOmitted({ view }: { view: QualityToolView }): JSX.Element | null {
  if (view.omitted <= 0) return null;
  return (
    <ToolStateNote
      icon="unfoldMore"
      tone="neutral"
      text={`${String(view.omitted)} more not shown — raise \`limit\` to read them`}
    />
  );
}

/** One block per section the view asked for: a head when it has a title, then its rows. */
function QualitySections({ view }: { view: QualityToolView }): JSX.Element[] {
  const t = useAdwaita();
  return view.sections.map((entry, index) => (
    <div
      key={`${entry.title || "rows"}-${String(index)}`}
      style={toolBodyStack(t)}
    >
      <ToolSectionHead text={entry.title} />
      {entry.rows.map((row, rowIndex) => (
        <ToolDataRow
          key={`${row.key}-${String(rowIndex)}`}
          row={row}
          first={rowIndex === 0}
          variants={QUALITY_BADGE_VARIANTS}
          pressable={false}
        />
      ))}
    </div>
  ));
}

export interface QualityToolRowsProps {
  item: ToolTranscriptItem;
}

export function QualityToolRows({ item }: QualityToolRowsProps): JSX.Element {
  const t = useAdwaita();
  const tool = item.name.toLowerCase();

  if (item.status === "running")
    return <ToolRunning text={RUNNING_TEXT[tool] ?? "reading the project"} />;

  const view = qualityToolViewOf(item.name, item.args, item.details, item.status);

  if (view === null) return <ToolUnknownResult item={item} tool={tool} />;

  const status = view.status;
  const clean = status === "none" || status === "empty";

  return (
    <div style={toolBodyStack(t)}>
      <ToolChips cells={view.cells} />
      {clean ? null : (
        <ToolSummary
          text={view.headline}
          tone={status === "ok" ? "neutral" : toneOf(status)}
        />
      )}
      <QualitySections view={view} />
      <QualityOmitted view={view} />
      <QualityNote view={view} />
    </div>
  );
}
