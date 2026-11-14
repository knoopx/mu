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
  ToolRunning,
  ToolSections,
  ToolStatusNote,
  ToolUnknownResult,
} from "../../core/components/ToolDataRows";
import {
  headerLineOf,
  toolPreviewLine,
  type ToolPreviewVocabulary,
} from "../../core/lib/agent/toolPreview";
import {
  toolBodyStack,
  type ToolRowCell,
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
import { qualityCellOf, qualityToolViewOf } from "../lib/toolView";
import type { QualityCell, QualityToolView } from "../types";

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

/** The tool header: what ran, what it counted, and the scope it was pointed at. */
export const qualityToolPreviewOf = (item: ToolTranscriptItem): string =>
  toolPreviewLine(
    item,
    qualityToolViewOf(item.name, item.args, item.details, item.status),
    QUALITY_WORDS,
    headOf,
  );

/** The header says which project the call read, and nothing else: the counts are
 *  the rows' to say, and saying them twice put one copy where it would be cut
 *  mid-word by the header's own budget. */
function headOf(tool: string, view: QualityToolView): string {
  // One line: the scope the survey ran over, and along it what the survey found and
  // how much of it fell off the limit. The rows below are the findings themselves;
  // none of them counts the set again.
  return headerLineOf(qualityCellOf(view, SCOPE_LABELS[tool] ?? "scope"), [
    view.headline,
    view.omitted > 0 ? `${String(view.omitted)} more not shown` : "",
  ]);
}

/**
 * The scope is the header's, so it is not a chip too: `code-complexity (cwd)`
 * over a chip reading `scope (cwd)` was one fact printed twice on one row. The
 * cell stays in the view, because the header reads it out of there.
 */
/**
 * What the survey ran with — the analyzer and its version, the thresholds it judged
 * against, how much of the project it read. They are the call rather than its
 * answer, so they ride the header.
 */
export function qualityChipsOf(
  item: ToolTranscriptItem,
): readonly ToolRowCell[] {
  const view = qualityToolViewOf(
    item.name,
    item.args,
    item.details,
    item.status,
  );
  return view === null ? [] : chipCellsOf(item.name.toLowerCase(), view);
}

function chipCellsOf(tool: string, view: QualityToolView): QualityCell[] {
  const scope = SCOPE_LABELS[tool] ?? "scope";
  return view.cells.filter((cell) => cell.label !== scope);
}

export interface QualityToolRowsProps {
  item: ToolTranscriptItem;
}

export function QualityToolRows({ item }: QualityToolRowsProps): JSX.Element {
  const t = useAdwaita();
  const tool = item.name.toLowerCase();

  if (item.status === "running")
    return <ToolRunning text={RUNNING_TEXT[tool] ?? "reading the project"} />;

  const view = qualityToolViewOf(
    item.name,
    item.args,
    item.details,
    item.status,
  );

  if (view === null) return <ToolUnknownResult item={item} tool={tool} />;

  const status = view.status;

  return (
    <div style={toolBodyStack(t)}>
      <ToolSections
        sections={view.sections}
        variants={QUALITY_BADGE_VARIANTS}
      />
      <ToolStatusNote
        status={status}
        note={view.note}
        tones={QUALITY_STATUS_TONES}
        icons={QUALITY_STATUS_ICONS}
      />
    </div>
  );
}
