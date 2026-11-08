/**
 * What the planning plugin shares: the tool name a guardrail rule points at, the
 * standings a step can be in, and the bounds one plan lives inside.
 */

export const PLAN_TOOL = "plan";
export const PLAN_TOOL_LABEL = "Plan";

/**
 * This name is what a guardrail rule and a story point at, so it is never
 * renamed or aliased.
 */
export const PLANNING_TOOL_NAMES: readonly string[] = [PLAN_TOOL];

/**
 * The three standings a step has, in the order a plan reads down them.
 *
 * They are the words the caller writes and the words the answer reads back, so a
 * plan call can be re-sent with one word changed and nothing else moves.
 */
export const PLAN_STATUSES = ["pending", "in_progress", "completed"] as const;

/**
 * How a standing is said to the human.
 *
 * The log's badge column holds state words, and `in_progress` is a field name:
 * the row says what it means in the two words a reader already knows, and
 * `completed` is the same thing said in the shortest word that says it. The
 * caller's words stay in the answer, which is where they came from.
 */
export const PLAN_STATUS_WORDS: Readonly<Record<string, string>> = {
  pending: "pending",
  in_progress: "in progress",
  completed: "done",
};

/**
 * The ceiling one call may send.
 *
 * It is the schema's, not the plan's: a list this long is kept whole, because a
 * plan that lost a step in the middle would be a different plan. What is bounded
 * is what the log draws and what the answer reads back — see `MAX_PLAN_ROWS`.
 */
export const MAX_STEPS = 100;

/**
 * How many steps one row draws and the answer reads back.
 *
 * A plan longer than this is a schedule, and the log would be nothing but it;
 * the cut is counted, so the caller knows the plan outgrew the row that shows it.
 */
export const MAX_PLAN_ROWS = 20;

/** A step is one line of intent. Past this it is a paragraph with a check box. */
export const MAX_STEP_CHARS = 200;
