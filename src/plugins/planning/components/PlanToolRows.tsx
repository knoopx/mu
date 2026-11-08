/**
 * Draws a plan call in the transcript: the list, each step in the colour of
 * where it stands, and — when the call could not be read — the steps that could
 * not be.
 *
 * The chips, the rows, the note of a state and the truncation are core's, so a
 * plan row is built of the same parts as every other answer in the log: the
 * step's number stands in the log's id column, its words in the body, and its
 * standing in the pill column every row of this list shares. This file owns only
 * the words a plan answer has that no other answer has.
 */

import type { JSX } from "react";
import { useAdwaita, type IconName } from "adwaita-gpuix";

import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import { firstLine } from "../../../utils/truncate";
import {
  ToolChips,
  ToolRowList,
  ToolRunning,
  ToolStatusNote,
  ToolSummary,
  ToolTruncated,
  ToolUnknownResult,
} from "../../core/components/ToolDataRows";
import { counted } from "../../core/lib/agent/toolText";
import {
  toolPreviewLine,
  type ToolPreviewVocabulary,
} from "../../core/lib/agent/toolPreview";
import {
  toolBodyStack,
  toolStatusTone,
  type ToolRowTone,
} from "../../core/lib/ui/toolRowPaint";
import { PLAN_TOOL } from "../constants";
import { activeStepOf, planIsDone } from "../lib/steps";
import {
  PLAN_BADGE_VARIANTS,
  planBadRowsOf,
  planFailureLine,
  planRowsOf,
  planToolViewOf,
  type PlanToolView,
} from "../lib/toolView";

const RUNNING_TEXT: Record<string, string> = {
  [PLAN_TOOL]: "writing the plan",
};

const EMPTY_TEXT: Record<string, string> = {
  [PLAN_TOOL]: "the plan was cleared",
};

/** A plan answer's own words, so the header never has to guess. */
const PLAN_WORDS: ToolPreviewVocabulary = {
  running: RUNNING_TEXT,
  runningDefault: "writing the plan",
  clean: ["empty"],
  empty: EMPTY_TEXT,
  emptyDefault: "no steps",
  stated: {},
};

const PLAN_STATUS_TONES: Readonly<Record<string, ToolRowTone>> = {
  empty: "neutral",
  failed: "bad",
};

const PLAN_STATUS_ICONS: Readonly<Record<string, IconName>> = {
  empty: "info",
  failed: "close",
};

export function isPlanTool(name: string): boolean {
  return name.toLowerCase() === PLAN_TOOL;
}

/**
 * The tool header: how far the plan has got, and the step it is on.
 *
 * The counts belong to the chips below, but a reader scanning the log wants one
 * thing from a plan row — what is being worked on now — and the row that lists
 * twenty steps cannot say it. A finished plan says it is finished instead.
 */
export const planToolPreviewOf = (item: ToolTranscriptItem): string =>
  toolPreviewLine(
    item,
    planToolViewOf(item.name, item.args, item.details, item.status),
    PLAN_WORDS,
    headOf,
  );

function headOf(_tool: string, view: PlanToolView): string {
  const { plan } = view;
  if (plan.status === "failed") return planFailureLine(plan);
  if (planIsDone(plan)) return `${counted(plan.counts.total, "step")} done`;

  const active = activeStepOf(plan);
  if (active === null) return counted(plan.counts.total, "step");
  return `${String(plan.counts.completed)}/${String(plan.counts.total)} · ${active.content}`;
}

/**
 * The row's last words: what a cleared plan cleared, and what a call that failed
 * before it answered said. A refusal needs none of its own — the summary line
 * above its rows already names the steps it could not read.
 */
function noteOf(item: ToolTranscriptItem, view: PlanToolView): string {
  if (item.status === "error") {
    const line = firstLine(item.output);
    return line === "" ? `${PLAN_TOOL} failed` : line;
  }
  return view.status === "empty" ? view.plan.error : "";
}

export interface PlanToolRowsProps {
  item: ToolTranscriptItem;
}

export function PlanToolRows({ item }: PlanToolRowsProps): JSX.Element {
  const t = useAdwaita();

  if (item.status === "running") {
    return <ToolRunning text={RUNNING_TEXT[item.name.toLowerCase()] ?? RUNNING_TEXT[PLAN_TOOL]} />;
  }

  const view = planToolViewOf(item.name, item.args, item.details, item.status);
  if (view === null) return <ToolUnknownResult item={item} tool={item.name} />;

  const { plan } = view;
  const tone = toolStatusTone(view.status, PLAN_STATUS_TONES);

  return (
    <div style={toolBodyStack(t)}>
      <ToolChips cells={view.cells} />

      {plan.status === "failed" ? (
        <>
          <ToolSummary text={planFailureLine(plan)} tone={tone} />
          <ToolRowList
            rows={planBadRowsOf(plan)}
            variants={PLAN_BADGE_VARIANTS}
            pressable={false}
          />
        </>
      ) : (
        <ToolRowList
          rows={planRowsOf(plan)}
          variants={PLAN_BADGE_VARIANTS}
          pressable={false}
        />
      )}

      <ToolTruncated
        count={plan.notShown}
        text={`… ${counted(plan.notShown, "step")} more not drawn — the plan outgrew the row: consolidate its steps`}
      />

      <ToolStatusNote
        status={view.status}
        note={noteOf(item, view)}
        tones={PLAN_STATUS_TONES}
        icons={PLAN_STATUS_ICONS}
      />
    </div>
  );
}
