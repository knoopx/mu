/**
 * Draws a plan call in the transcript: the list, each step in the colour of
 * where it stands, and — when the call could not be read — the steps that could
 * not be.
 *
 * The rows, the note of a state and the truncation are core's, so a plan row is
 * built of the same parts as every other answer in the log: the step's number
 * stands in the log's id column, its words in the body, and its standing in the
 * pill column every row of this list shares. A plan has no chip line: the head
 * already says how far the work has got, and every step under it wears where it
 * stands, so a row of counts above the list says twice what the row says once.
 * This file owns only the words a plan answer has that no other answer has.
 */

import type { JSX } from "react";
import { useAdwaita, type IconName } from "adwaita-gpuix";

import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import { firstLine } from "../../../utils/truncate";
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
  // A plan the call refused to write is named once, here: the row has no steps to
  // show, so the header is the only line that can say why. The body names the steps
  // that caused it.
  if (plan.status === "failed") return planFailureLine(plan);
  // The steps the row would not draw are a count, and counts ride this line: the
  // card below is the plan's steps and nothing else.
  const omitted =
    plan.notShown === 0 ? "" : `… ${counted(plan.notShown, "step")} not shown`;
  if (planIsDone(plan))
    return headerLineOf(`${counted(plan.counts.total, "step")} done`, [
      omitted,
    ]);

  const active = activeStepOf(plan);
  return headerLineOf(
    active === null
      ? counted(plan.counts.total, "step")
      : `${String(plan.counts.completed)}/${String(plan.counts.total)} · ${active.content}`,
    [omitted],
  );
}

/**
 * The row's last words: what a cleared plan cleared, and what a call that failed
 * before it answered said. A refusal needs none of its own — the summary line
 * above its rows already names the steps it could not read.
 */
function noteOf(item: ToolTranscriptItem, view: PlanToolView): string {
  // A refused plan is stated once, in the header; the row ends at the steps that
  // caused it rather than saying the same sentence again under them.
  if (view.plan.status === "failed") return "";
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
    return (
      <ToolRunning
        text={RUNNING_TEXT[item.name.toLowerCase()] ?? RUNNING_TEXT[PLAN_TOOL]}
      />
    );
  }

  const view = planToolViewOf(item.name, item.args, item.details, item.status);
  if (view === null) return <ToolUnknownResult item={item} tool={item.name} />;

  const { plan } = view;

  return (
    <div style={toolBodyStack(t)}>
      {
        // Not the refusal again — the header carries it — but the steps that caused
        // it, each with what was wrong about it.
        plan.status === "failed" ? (
          <ToolRowList
            rows={planBadRowsOf(plan)}
            variants={PLAN_BADGE_VARIANTS}
            pressable={false}
          />
        ) : (
          <ToolRowList
            rows={planRowsOf(plan)}
            variants={PLAN_BADGE_VARIANTS}
            pressable={false}
          />
        )
      }

      <ToolStatusNote
        status={view.status}
        note={noteOf(item, view)}
        tones={PLAN_STATUS_TONES}
        icons={PLAN_STATUS_ICONS}
      />
    </div>
  );
}
