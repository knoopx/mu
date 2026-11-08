/**
 * What a plan is, and what a plan call answers with.
 *
 * A plan is one ordered list of steps, and the list is the whole state: every
 * call replaces it, so there is no per-step edit to reconcile and no order for
 * updates to arrive in. It travels in a tool result as data — the steps and
 * where each stands — so the log draws it in the theme the window is wearing now
 * and a session resumed next week draws the same list out of its own row.
 */

import type { PLAN_STATUSES } from "./constants";

/** Where one step stands: not started, being worked on, finished. */
export type PlanStatus = (typeof PLAN_STATUSES)[number];

/**
 * `ok` wrote a plan; `empty` wrote an empty list, which clears the plan;
 * `failed` is a step the call cannot mean — no content, or a standing that is
 * none of the three. The whole call is refused rather than drawn short.
 */
export type PlanCallStatus = "ok" | "empty" | "failed";

/** One step of a plan, in the order the caller sent it. */
export interface PlanStep {
  /** Its position, 1-based: the log's id column and the answer's `#` column. */
  at: number;

  content: string;
  status: PlanStatus;
}

/** What a plan adds up to, by standing. */
export interface PlanCounts {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

/** A step the call could not read, and what was written where it should be. */
export interface PlanBadStep {
  /** Which entry of the call's list it came from, 0-based. */
  at: number;

  /** Whatever the step had to say, when its standing was the problem. */
  content: string;

  /** The standing that was written, as it was written. */
  status: string;

  reason: "no content" | "no such status";
}

/** A plan call's whole answer — the plan itself, and what was made of it. */
export interface PlanFigure {
  status: PlanCallStatus;

  /** Every step that was read, in order. A refusal keeps none. */
  steps: PlanStep[];

  counts: PlanCounts;

  /** How many steps the row draws and the answer reads back … */
  shown: number;

  /** … and how many the budget left out. */
  notShown: number;

  bad: PlanBadStep[];

  error: string;
}

/** What a caller asked to be written down, before any of it is read. */
export interface PlanParams {
  steps: readonly unknown[];
}
