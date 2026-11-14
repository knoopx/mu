/**
 * Draws a guardrails call in the transcript.
 *
 * The header is the call's one summary — what it was pointed at, what it
 * counted, and what the card left out — and the figures the call ran with ride
 * that header as chips, because they are the call rather than its answer. What
 * is left below is the answer itself: rows the log's own painter lays out, so a
 * suite's verdicts and a coverage scan's domains stand in columns measured
 * across the list instead of a word hugging whatever length its name had. This
 * file owns only the words a guardrails answer has that no other answer has.
 */

import type { JSX } from "react";
import { T, useAdwaita, type IconName } from "adwaita-gpuix";

import { firstLine } from "../../../utils/truncate";
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
import { mutedText } from "../../core/lib/ui/theme";
import {
  toolBodyStack,
  type ToolRowCell,
  type ToolRowTone,
} from "../../core/lib/ui/toolRowPaint";
import { toolMonoOneLine } from "../../core/lib/ui/toolRows";
import {
  GUARDRAILS_COVERAGE_TOOL,
  GUARDRAILS_FIXTURE_TOOL,
  GUARDRAILS_TEST_TOOL,
} from "../constants";
import {
  GUARDRAILS_BADGE_VARIANTS,
  guardrailsNoteOf,
  guardrailsScopeOf,
  guardrailsTailOf,
  guardrailsToolViewOf,
  type GuardrailsToolView,
} from "../lib/toolView";

const TOOL_NAMES: readonly string[] = [
  GUARDRAILS_TEST_TOOL,
  GUARDRAILS_FIXTURE_TOOL,
  GUARDRAILS_COVERAGE_TOOL,
];

const RUNNING_TEXT: Record<string, string> = {
  [GUARDRAILS_TEST_TOOL]: "running the suite",
  [GUARDRAILS_FIXTURE_TOOL]: "writing fixtures",
  [GUARDRAILS_COVERAGE_TOOL]: "reading sessions",
};

/** What a call that read everything and found nothing to grade says instead. */
const EMPTY_TEXT: Record<string, string> = {
  [GUARDRAILS_TEST_TOOL]: "the suites hold no fixtures",
  [GUARDRAILS_FIXTURE_TOOL]: "nothing to write",
  [GUARDRAILS_COVERAGE_TOOL]: "no rules to have fired",
};

const GUARDRAILS_WORDS: ToolPreviewVocabulary = {
  running: RUNNING_TEXT,
  runningDefault: "guardrails",
  clean: ["empty"],
  empty: EMPTY_TEXT,
  emptyDefault: "nothing to report",
  stated: {},
};

/** Nothing in the rule set failed because a call came back empty; a suite with
 *  no fixtures is the one empty answer worth a warning, and it is the one that
 *  leaves a rule unproven. */
const GUARDRAILS_STATUS_TONES: Readonly<Record<string, ToolRowTone>> = {
  empty: "warn",
};

const GUARDRAILS_STATUS_ICONS: Readonly<Record<string, IconName>> = {
  empty: "warning",
  failed: "close",
};

export function isGuardrailsTool(name: string): boolean {
  return TOOL_NAMES.includes(name.toLowerCase());
}

/** The header: the scope, the tallies, and the rows the card would not draw. */
export const guardrailsToolPreviewOf = (item: ToolTranscriptItem): string =>
  toolPreviewLine(
    item,
    guardrailsToolViewOf(item.name, item.details, item.status),
    GUARDRAILS_WORDS,
    (_tool, view) =>
      headerLineOf(guardrailsScopeOf(view), guardrailsTailOf(view)),
  );

/**
 * The chips: the scan's file count and rule count, the parser the suite ran
 * against, the size of the suite before a write. They are the call's own
 * figures, so they ride its header; the card below is its answer.
 */
export const guardrailsChipsOf = (
  item: ToolTranscriptItem,
): readonly ToolRowCell[] => {
  const view = guardrailsToolViewOf(item.name, item.details, item.status);
  return view === null ? [] : view.cells;
};

/** The suite a write landed in. A path, not a tally: it is content, and it is
 *  the name of the file the next edit opens. */
function SuitePath({ path }: { path: string }): JSX.Element | null {
  const t = useAdwaita();
  if (path === "") return null;
  return (
    <T size="micro" color={mutedText(t)} style={toolMonoOneLine(t)}>
      {path}
    </T>
  );
}

export interface GuardrailsToolRowsProps {
  item: ToolTranscriptItem;
}

export function GuardrailsToolRows({
  item,
}: GuardrailsToolRowsProps): JSX.Element {
  const t = useAdwaita();
  const tool = item.name.toLowerCase();

  if (item.status === "running")
    return <ToolRunning text={RUNNING_TEXT[tool] ?? "guardrails"} />;

  const view: GuardrailsToolView | null = guardrailsToolViewOf(
    item.name,
    item.details,
    item.status,
  );
  if (view === null) return <ToolUnknownResult item={item} tool={tool} />;

  // A refusal is said once, on the header: the card of a call that answered
  // nothing has no content, so it ends at its header rather than repeating the
  // reason underneath it.
  const note = guardrailsNoteOf(view);

  return (
    <div style={toolBodyStack(t)}>
      <ToolSections
        sections={view.sections}
        variants={GUARDRAILS_BADGE_VARIANTS}
      />
      <SuitePath path={view.path} />
      <ToolStatusNote
        status={view.status}
        note={
          note === ""
            ? item.status === "error"
              ? firstLine(item.output)
              : ""
            : note
        }
        tones={GUARDRAILS_STATUS_TONES}
        icons={GUARDRAILS_STATUS_ICONS}
      />
    </div>
  );
}
