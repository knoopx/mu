/**
 * What a plan call says back.
 *
 * A plan has no partial updates, so the answer is the plan: the counts of where
 * it stands, then every step with its standing, in order. That is the reading a
 * caller re-sends from — it can change one word in the list it just got back
 * rather than rebuild the plan from memory, and a step it thought was done and
 * is not is visible in the row that says so.
 *
 * A refusal names each step it could not read and what was written there,
 * because the fix is one field of one entry and the call is otherwise right.
 */

import {
  blocks,
  counted,
  moreLine,
  partsLine,
  statusTable,
  tableOf,
} from "../../core/lib/agent/toolText";
import { MAX_PLAN_ROWS } from "../constants";
import type { PlanFigure } from "../types";
import { planIsDone } from "./steps";

/** What a step is made of, said once, where the caller can act on it. */
const PLAN_HINT =
  "a step is `{content, status}`, or a bare string for a step not started — status is one of pending, " +
  "in_progress, completed. The whole list is sent every call: a plan has no partial updates, so re-send " +
  "it with the standings as they now stand";

/** Where the plan stands, in one row of counts. */
function headOf(plan: PlanFigure): string {
  return statusTable({
    plan: counted(plan.counts.total, "step"),
    pending: String(plan.counts.pending),
    in_progress: String(plan.counts.inProgress),
    completed: String(plan.counts.completed),
  });
}

/** The steps themselves, as the table the caller reads them back from. */
function stepRowsOf(plan: PlanFigure, limit: number) {
  return plan.steps.slice(0, limit).map((step) => ({
    "#": String(step.at),
    status: step.status,
    step: step.content,
  }));
}

/** The line a plan that ran out has: nothing is in progress, and nothing is waiting. */
function doneNote(plan: PlanFigure): string {
  if (!planIsDone(plan)) return "";
  return partsLine(
    "the plan is finished",
    `${counted(plan.counts.total, "step")} completed`,
  );
}

/** What the row's budget left out, in the words that say what to do about it. */
function beyondNote(plan: PlanFigure): string {
  if (plan.notShown <= 0) return "";
  return partsLine(
    `… ${counted(plan.notShown, "step")} beyond the ${String(MAX_PLAN_ROWS)} the row shows`,
    "a plan longer than that is a schedule — consolidate steps or split the work",
  );
}

/** A plan that was written: its counts, then the plan. */
export function planAnswerOf(plan: PlanFigure): string {
  const rows = stepRowsOf(plan, MAX_PLAN_ROWS);

  return blocks(
    headOf(plan),
    rows.length === 0 ? "" : tableOf(rows),
    doneNote(plan),
    beyondNote(plan),
  );
}

/** A step the call could not read: which one, what was wrong, and what was written. */
export function planFailedAnswer(plan: PlanFigure): string {
  const rows = plan.bad.slice(0, MAX_PLAN_ROWS).map((bad) => ({
    step: `step ${String(bad.at + 1)}`,
    why: bad.reason,
    standing: bad.status === "" ? "(nothing)" : bad.status,
    content: bad.content === "" ? "(nothing)" : bad.content,
  }));

  return blocks(
    statusTable({
      plan: "0 steps",
      ...(plan.bad.length === 0
        ? {}
        : { refused: counted(plan.bad.length, "step") }),
    }),
    rows.length === 0 ? "" : tableOf(rows),
    plan.error,
    PLAN_HINT,
    moreLine(plan.bad.length - rows.length, "step"),
  );
}

/** A call that wrote no steps at all — which clears the plan, and says so. */
export const planEmptyAnswer = (plan: PlanFigure): string =>
  blocks(
    statusTable({ plan: "0 steps" }),
    plan.error === "" ? "the plan has no steps" : plan.error,
    PLAN_HINT,
  );
