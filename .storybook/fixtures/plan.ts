import { PLAN_TOOL } from "../../src/plugins/planning/constants";
import { planAnswerOf, planFailedAnswer } from "../../src/plugins/planning/lib/answer";
import { planOf } from "../../src/plugins/planning/lib/steps";
import { toolCallFixture, type ToolFixture } from "./tool";

/** The plan the agent wrote down before it started: one step begun, five waiting. */
export const PLAN_OPEN_PARAMS = {
  steps: [
    { content: "read how a plugin's tool rows are drawn", status: "in_progress" },
    { content: "write the plan contract in lib/steps.ts", status: "pending" },
    { content: "draw the plan rows in the log", status: "pending" },
    { content: "wire `plan` into the agent's tool list", status: "pending" },
    { content: "add the story scene", status: "pending" },
    { content: "write the plugin's notes into AGENTS.md", status: "pending" },
  ],
};

const open = planOf(PLAN_OPEN_PARAMS);

/** The first plan row: the list as it stood when the work began. */
export const PLAN_OPEN_ITEM: ToolFixture = toolCallFixture(
  "call-plan-open",
  PLAN_TOOL,
  PLAN_OPEN_PARAMS,
  "ok",
  planAnswerOf(open),
  { details: open },
);

/** The same list, three steps later — the whole list again, with the standings moved. */
export const PLAN_LATER_PARAMS = {
  steps: [
    { content: "read how a plugin's tool rows are drawn", status: "completed" },
    { content: "write the plan contract in lib/steps.ts", status: "completed" },
    { content: "draw the plan rows in the log", status: "in_progress" },
    { content: "wire `plan` into the agent's tool list", status: "pending" },
    { content: "add the story scene", status: "pending" },
    { content: "write the plugin's notes into AGENTS.md", status: "pending" },
  ],
};

const later = planOf(PLAN_LATER_PARAMS);

/** A plan row that shows progress: two steps done, the third being worked on. */
export const PLAN_LATER_ITEM: ToolFixture = toolCallFixture(
  "call-plan-later",
  PLAN_TOOL,
  PLAN_LATER_PARAMS,
  "ok",
  planAnswerOf(later),
  { details: later },
);

/** An entry that carried a standing and nothing to do — the half of a step the caller forgot. */
export const PLAN_BAD_PARAMS = {
  steps: [
    "read how a plugin's tool rows are drawn",
    { status: "in_progress" },
    "write the plan contract in lib/steps.ts",
  ],
};

const bad = planOf(PLAN_BAD_PARAMS);

/** The refused call: the whole list went, and the answer names the step. */
export const PLAN_BAD_ITEM: ToolFixture = toolCallFixture(
  "call-plan-bad",
  PLAN_TOOL,
  PLAN_BAD_PARAMS,
  "ok",
  planFailedAnswer(bad),
  { details: bad },
);

export const PLAN_ANSWER =
  "The plan held its shape through the change: the contract went in first, so the rows had something to draw, and " +
  "the tool was wired in only once the answer existed to draw. Two steps are left — the story scene and the notes " +
  "in AGENTS.md — and the list says so in the same order it was written.";
