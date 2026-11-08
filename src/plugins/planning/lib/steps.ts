/**
 * The one plan contract: an ordered list of steps, read whole.
 *
 * A caller writes loosely and is met there rather than crashed — a bare string
 * is a step not started, one value where the list belongs is a list of one, and
 * a standing written as `In-Progress` or `doing` means the standing it means, the
 * way a program's rows read their state words. A model that meant a step should
 * get a step, not a refusal.
 *
 * What a step *cannot* mean is answered and refused: nothing to do, or a standing
 * that is none of the three. The whole call goes, and the answer names each step
 * it could not read — a plan that quietly lost its middle step would be a
 * different plan, and the caller would have no way to find out.
 *
 * Nothing here keeps the plan or resolves a colour: the list travels as data in
 * the call's own `details`, and the log redraws it from there. A plan has no
 * store to fall out of step with, because the log *is* the plan — the last plan
 * row of a session is the plan that session ended with.
 */

import { truncateToWidth } from "../../../utils/truncate";
import { MAX_PLAN_ROWS, MAX_STEP_CHARS } from "../constants";
import type {
  PlanBadStep,
  PlanCounts,
  PlanFigure,
  PlanParams,
  PlanStatus,
  PlanStep,
} from "../types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The slot that should hold the list, read the way a program's rows are read:
 * one value named where a list was expected is a list of one. The schema will
 * not say so, and a reader that reached for `.map` on it would lose the step.
 */
function listOf(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

const CONTENT_KEYS = ["content", "step", "text", "title", "label", "name"] as const;
const STATUS_KEYS = ["status", "state"] as const;

/** The order a step written as an array puts its parts in. */
const AT_CONTENT = 0;
const AT_STATUS = 1;

const keyOf = (
  row: Record<string, unknown>,
  keys: readonly string[],
): unknown => keys.reduce<unknown>((found, key) => found ?? row[key], undefined);

/** A step clipped to a step's measure: one line of intent, not a paragraph. */
const stepText = (value: unknown): string =>
  truncateToWidth(
    typeof value === "string"
      ? value.replace(/\s+/g, " ").trim()
      : typeof value === "number"
        ? String(value)
        : "",
    MAX_STEP_CHARS,
  );

/**
 * The standings a caller reaches for, folded.
 *
 * Case, spacing, underscores and the ordinary synonyms all spell the same
 * standing; a plan call that said `doing` and was refused for it would be
 * refused for its spelling, which is not the caller's mistake.
 */
const STATUS_WORDS: Readonly<Record<string, PlanStatus>> = {
  pending: "pending",
  todo: "pending",
  upcoming: "pending",
  planned: "pending",
  plannednext: "pending",
  next: "pending",
  open: "pending",
  notstarted: "pending",
  new: "pending",

  inprogress: "in_progress",
  doing: "in_progress",
  started: "in_progress",
  active: "in_progress",
  current: "in_progress",
  ongoing: "in_progress",
  wip: "in_progress",

  completed: "completed",
  complete: "completed",
  done: "completed",
  finished: "completed",
  resolved: "completed",
};

/** A standing read from however it was written; `null` is a word nothing means. */
function statusOf(value: unknown): PlanStatus | null {
  if (value === undefined || value === null) return "pending";
  if (typeof value !== "string") return null;
  const word = value.trim().toLowerCase().replace(/[\s_-]/g, "");
  if (word === "") return "pending";
  return STATUS_WORDS[word] ?? null;
}

/** What one step of the call holds, whatever shape it was written in. */
interface StepShape {
  content: string;
  status: PlanStatus | null;

  /** The standing as it was written, so a refusal can quote it. */
  written: string;
}

function stepShapeOf(value: unknown): StepShape {
  if (typeof value === "string" || typeof value === "number") {
    return { content: stepText(value), status: "pending", written: "" };
  }

  if (Array.isArray(value)) {
    const written = value[AT_STATUS];
    return {
      content: stepText(value[AT_CONTENT]),
      status: statusOf(value[AT_STATUS]),
      written: typeof written === "string" ? written.trim() : "",
    };
  }

  if (isRecord(value)) {
    const written = keyOf(value, STATUS_KEYS);
    return {
      content: stepText(keyOf(value, CONTENT_KEYS)),
      status: statusOf(written),
      written: typeof written === "string" ? written.trim() : "",
    };
  }

  return { content: "", status: "pending", written: "" };
}

/** One entry of the call, read: either a step or the reason it is not one. */
function readStep(value: unknown, at: number): PlanStep | PlanBadStep {
  const shape = stepShapeOf(value);

  if (shape.content === "") {
    return { at, content: "", status: shape.written, reason: "no content" };
  }
  if (shape.status === null) {
    return {
      at,
      content: shape.content,
      status: shape.written,
      reason: "no such status",
    };
  }
  return { at: at + 1, content: shape.content, status: shape.status };
}

const isBad = (read: PlanStep | PlanBadStep): read is PlanBadStep =>
  "reason" in read;

export const emptyCounts = (): PlanCounts => ({
  total: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
});

export function countsOf(steps: readonly PlanStep[]): PlanCounts {
  const counts = emptyCounts();
  counts.total = steps.length;
  for (const step of steps) {
    if (step.status === "pending") counts.pending += 1;
    else if (step.status === "in_progress") counts.inProgress += 1;
    else counts.completed += 1;
  }
  return counts;
}

/** Why a refusal happened, in the one line that says which half of a step was wrong. */
function causeOf(bad: readonly PlanBadStep[]): string {
  if (bad.some((step) => step.reason === "no content")) {
    return "a step names nothing to do";
  }
  return "a step's standing is not one of pending, in_progress, completed";
}

/**
 * The plan the call wrote.
 *
 * Nothing is dropped on the way in: a step is kept as long as it can be read,
 * and the first thing that cannot be read takes the whole call with it, named.
 */
export function planOf(params: PlanParams): PlanFigure {
  if (params.steps === undefined || params.steps === null) {
    return {
      status: "failed",
      steps: [],
      counts: emptyCounts(),
      shown: 0,
      notShown: 0,
      bad: [],
      error: "missing required parameter: steps",
    };
  }

  const read = listOf(params.steps).map(readStep);
  const bad = read.filter(isBad);

  if (bad.length > 0) {
    return {
      status: "failed",
      steps: [],
      counts: emptyCounts(),
      shown: 0,
      notShown: 0,
      bad,
      error: causeOf(bad),
    };
  }

  const steps = (read as PlanStep[]).map((step, index) => ({
    ...step,
    at: index + 1,
  }));

  if (steps.length === 0) {
    return {
      status: "empty",
      steps: [],
      counts: emptyCounts(),
      shown: 0,
      notShown: 0,
      bad: [],
      error: "the plan is cleared: every step it held is gone",
    };
  }

  return {
    status: "ok",
    steps,
    counts: countsOf(steps),
    shown: Math.min(steps.length, MAX_PLAN_ROWS),
    notShown: Math.max(0, steps.length - MAX_PLAN_ROWS),
    bad: [],
    error: "",
  };
}

/** The step the work is on: the one in progress, or the next one waiting. */
export function activeStepOf(plan: PlanFigure): PlanStep | null {
  return (
    plan.steps.find((step) => step.status === "in_progress") ??
    plan.steps.find((step) => step.status === "pending") ??
    null
  );
}

/** A plan with nothing left to do. */
export const planIsDone = (plan: PlanFigure): boolean =>
  plan.status === "ok" &&
  plan.counts.total > 0 &&
  plan.counts.completed === plan.counts.total;
