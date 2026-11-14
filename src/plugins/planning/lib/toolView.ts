/**
 * Turns a plan answer into what the transcript draws.
 *
 * A call answers two audiences: `content` text for the model, and the plan
 * itself in `details` for the log. This file folds that into one view — the rows
 * to paint and the shape of a refusal — so the component never parses an answer
 * and never re-reads a count. A plan says where it stands in its own rows, each
 * step wearing its standing, and in the head's count of how far the work has
 * got: a line of count chips above the list only restates both. The details of a
 * session resumed this week are JSON rather than a live object, so every reader
 * here checks the shape instead of trusting it.
 */

import type { BadgeVariant } from "adwaita-gpuix";

import {
  detailsAs,
  detailList,
  detailNumber,
  detailText,
  detailWord,
} from "../../core/lib/agent/toolDetails";
import type { ToolPaintRow, ToolRowTone } from "../../core/lib/ui/toolRowPaint";
import { MAX_PLAN_ROWS, PLAN_STATUS_WORDS, PLAN_TOOL } from "../constants";
import type {
  PlanBadStep,
  PlanCallStatus,
  PlanCounts,
  PlanFigure,
  PlanStatus,
  PlanStep,
} from "../types";
import { countsOf, emptyCounts } from "./steps";

/** A step is drawn in the colour of where it stands. */
const PLAN_ROW_TONES: Readonly<Record<PlanStatus, ToolRowTone>> = {
  pending: "neutral",
  in_progress: "accent",
  completed: "ok",
};

/** The pill a standing wears: a done step is settled, a live one is the accent, a waiting one is quiet. */
export const PLAN_BADGE_VARIANTS: Readonly<Record<string, BadgeVariant>> = {
  pending: "outline",
  "in progress": "default",
  done: "success",
  "no content": "destructive",
  "no such status": "destructive",
};

export interface PlanToolView {
  status: PlanCallStatus;

  /** The plan, or the shape of the refusal. Never absent: the header reads it too. */
  plan: PlanFigure;
}

const EMPTY_PLAN: PlanFigure = {
  status: "empty",
  steps: [],
  counts: emptyCounts(),
  shown: 0,
  notShown: 0,
  bad: [],
  error: "",
};

/** The statuses a plan answer can carry; anything else is not a plan call. */
const CALL_STATUSES = [
  "ok",
  "empty",
  "failed",
] as const satisfies readonly PlanCallStatus[];

/** A standing read back from `details` — the words the tool wrote, forgiving of case. */
function statusWordOf(value: unknown): PlanStatus {
  const word = detailText(value)
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  if (word === "completed" || word === "complete" || word === "done") {
    return "completed";
  }
  return word === "inprogress" ? "in_progress" : "pending";
}

function stepOf(value: unknown): PlanStep | null {
  const step = detailsAs<PlanStep>(value);
  if (step === null) return null;
  const content = detailText(step.content).trim();
  if (content === "") return null;
  return {
    at: detailNumber(step.at),
    content,
    status: statusWordOf(step.status),
  };
}

function badOf(value: unknown): PlanBadStep {
  const bad = detailsAs<PlanBadStep>(value) ?? {
    at: 0,
    content: "",
    status: "",
    reason: "no content" as const,
  };
  return {
    at: detailNumber(bad.at),
    content: detailText(bad.content),
    status: detailText(bad.status),
    reason:
      detailText(bad.reason) === "no such status"
        ? "no such status"
        : "no content",
  };
}

/** The plan a call left in its details, read as the JSON a resumed session keeps. */
/**
 * The plan a call left in its details.
 *
 * It is read through `PlanFigure` — the interface the tool wrote — so the field
 * names here are checked against it, while every value is still coerced: the
 * details of a session resumed this week are JSON, not the object the call
 * returned, and a step the caller wrote loosely is folded, not dropped.
 */
function planFigureOf(details: unknown): PlanFigure | null {
  const answer = detailsAs<PlanFigure>(details);
  if (answer === null) return null;
  const status = detailWord(answer.status, CALL_STATUSES);
  if (status === null || !Array.isArray(answer.steps)) return null;

  const steps = detailList<unknown>(answer.steps)
    .map(stepOf)
    .filter((step): step is PlanStep => step !== null);

  const counts = detailsAs<PlanCounts>(answer.counts);

  return {
    status,
    steps,
    counts:
      counts === null
        ? countsOf(steps)
        : {
            total: detailNumber(counts.total),
            pending: detailNumber(counts.pending),
            inProgress: detailNumber(counts.inProgress),
            completed: detailNumber(counts.completed),
          },
    shown: detailNumber(answer.shown),
    notShown: detailNumber(answer.notShown),
    bad: detailList<unknown>(answer.bad).map(badOf),
    error: detailText(answer.error),
  };
}

/** The line a refusal leaves behind: how many steps, and what was wrong with the first. */
export function planFailureLine(plan: PlanFigure): string {
  const first = plan.bad[0];
  if (first === undefined) return plan.error;

  const where = `step ${String(first.at + 1)}`;
  const what =
    first.reason === "no content"
      ? "names nothing to do"
      : `standing “${first.status === "" ? "(nothing)" : first.status}” is none of the three`;

  return plan.bad.length === 1
    ? `${where} ${what}`
    : `${where} ${what}, and ${String(plan.bad.length - 1)} more`;
}

/** One row per step: its number in the log's id column, what it is, and where it stands. */
export function planRowsOf(
  plan: PlanFigure,
  limit = MAX_PLAN_ROWS,
): ToolPaintRow[] {
  return plan.steps.slice(0, limit).map((step) => ({
    key: String(step.at),
    primary: step.content,
    secondary: "",
    badge: PLAN_STATUS_WORDS[step.status] ?? step.status,
    tone: PLAN_ROW_TONES[step.status],
  }));
}

/** The steps that could not be read, each wearing what was wrong with it. */
export function planBadRowsOf(
  plan: PlanFigure,
  limit = MAX_PLAN_ROWS,
): ToolPaintRow[] {
  return plan.bad.slice(0, limit).map((bad) => ({
    key: String(bad.at + 1),
    primary: bad.content === "" ? "(nothing to do)" : bad.content,
    secondary:
      bad.reason === "no content"
        ? ""
        : `standing: ${bad.status === "" ? "(nothing)" : bad.status}`,
    badge: bad.reason,
    tone: "bad" as ToolRowTone,
  }));
}

export function planToolViewOf(
  name: string,
  _args: Record<string, unknown> | undefined,
  details: unknown,
  itemStatus: string,
): PlanToolView | null {
  if (name.toLowerCase() !== PLAN_TOOL) return null;

  const plan = planFigureOf(details) ?? EMPTY_PLAN;
  // A call that errored before it answered has no plan in its details, and the
  // row must not read that silence as a plan that was cleared.
  const status: PlanCallStatus =
    itemStatus === "error" ? "failed" : plan.status;

  return {
    status,
    plan: { ...plan, status },
  };
}
