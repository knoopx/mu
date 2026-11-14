/**
 * `plan` — the work in hand, written down, and the list kept honest.
 *
 * The list is the whole state: every call replaces it, so there is no per-step
 * update to reconcile, no order for updates to arrive in, and no half-applied
 * edit to argue about later. The model gets the plan back as text — the counts,
 * then every step with its standing — which is the thing it re-sends with one
 * word changed, and what makes a step it thought was finished and is not
 * visible. The human gets the same list drawn in the log, each step in the
 * colour of where it stands.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type { PluginTool } from "../../core/lib/plugin/manifest";
import { toolResult } from "../../core/lib/agent/toolText";
import {
  MAX_STEP_CHARS,
  MAX_STEPS,
  PLAN_TOOL,
  PLAN_TOOL_LABEL,
} from "../constants";
import { planAnswerOf, planEmptyAnswer, planFailedAnswer } from "../lib/answer";
import { planOf } from "../lib/steps";
import type { PlanFigure, PlanParams } from "../types";

/** One step, written as a thing and its standing. */
const StepSchema = Type.Object({
  content: Type.String({
    maxLength: MAX_STEP_CHARS,
    description:
      "what this step is — one line naming what it produces, not how it is done",
  }),
  status: Type.Optional(
    Type.String({
      description:
        "where the step stands: `pending`, `in_progress` or `completed`. `doing`, `done`, `wip` and `In-Progress` are read as the standing they mean; omitted means `pending`.",
    }),
  ),
});

/** A step, or a bare line for a step not started yet. */
const EntrySchema = Type.Union(
  [
    StepSchema,
    Type.String({
      maxLength: MAX_STEP_CHARS,
      description: "one step, not started — the shorthand for a first plan",
    }),
  ],
  {
    description:
      "one step of the plan, or a bare string for a step not started",
  },
);

const PlanParametersSchema = Type.Object({
  steps: Type.Array(EntrySchema, {
    minItems: 0,
    maxItems: MAX_STEPS,
    description:
      "The whole plan, in the order it will be worked through. This REPLACES the previous list: there are no partial updates, so send every step every call. An empty list clears the plan.",
  }),
});

export function executePlan(params: PlanParams): AgentToolResult<PlanFigure> {
  const plan = planOf(params);

  if (plan.status === "failed") {
    return toolResult(planFailedAnswer(plan), plan);
  }
  if (plan.status === "empty") {
    return toolResult(planEmptyAnswer(plan), plan);
  }
  return toolResult(planAnswerOf(plan), plan);
}

export const planTool: PluginTool<typeof PlanParametersSchema, PlanFigure> = {
  name: PLAN_TOOL,
  icon: "taskAlt",
  label: PLAN_TOOL_LABEL,
  description:
    "Write down and update the plan for the work in hand. Send the ENTIRE list every call: it REPLACES the " +
    "previous one, and there are no partial updates or per-step edits. Each step is `{content, status}`, or a " +
    "bare string for a step not started; status is `pending`, `in_progress` or `completed`. Use it to plan " +
    "multi-step work — one step per concrete thing you are about to do — and to show progress: mark a step " +
    "`in_progress` as you start it and `completed` the moment it finishes, several at once only when work " +
    "genuinely runs in parallel. The answer is the plan read back — the counts, then every step with its " +
    "standing — which is what you re-send. A step with nothing to do, or a standing that is none of the three, " +
    "refuses the whole call and names the steps.",
  promptSnippet:
    "Write the current work plan in the log; every call replaces the whole list and answers with it read back",
  promptGuidelines: [
    "Use plan for multi-step work: one step per concrete thing you are about to do, written before you start it. A single-step job needs no list, and a list is not a licence to look organised.",
    "Every call replaces the whole list — there are no per-step updates. Send the entire list each time with the standings as they now stand, and never a shorter list than the one you last wrote unless the plan really shrank.",
    "Mark a step `in_progress` the moment you start it and `completed` the moment it finishes; do not batch completions. Several `in_progress` at once is correct when work genuinely runs in parallel, one when it runs in order.",
    "The answer is the plan read back: counts, then every step with its standing. Change one word in that list and re-send it, rather than rebuilding the plan from memory.",
    "Do not add the final answer or report as a step: it is the session's output, not a work step.",
    "A step with empty content, or a standing outside pending/in_progress/completed, refuses the whole call and names each step — the fix is one field of one entry, so re-send the same list with it corrected.",
    "A step is one line: what it produces, not how. Past 20 steps the row stops drawing them and says so — consolidate the steps or split the work.",
  ],

  executionMode: "sequential",
  parameters: PlanParametersSchema,

  async execute(_toolCallId, params) {
    return executePlan({ steps: params.steps });
  },
};
