import type {
  AgentToolResult,
  AgentToolUpdateCallback,
  ExtensionToolContext,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { ASK_TOOL_NAME } from "../constants";
import {
  assertUniqueOptionLabels,
  assertUniqueQuestions,
  buildPlainTextPrompt,
  normalizeQuestions,
} from "../lib/normalize";
import { askStore } from "../lib/store";
import type { AskUserDetails, AskUserParams, AskUserAnswer } from "../types";

function nonEmptyString(description: string) {
  return Type.String({
    minLength: 1,
    pattern: "^\\s*\\S",
    description,
  });
}

const AskOptionSchema = Type.Object({
  label: nonEmptyString(
    "Short label for this option, returned verbatim as the selected value. " +
      "List the recommended option first and suffix its label with ' (Recommended)'.",
  ),
  description: nonEmptyString(
    "Longer description explaining this option (required, non-empty)",
  ),
});

const AskQuestionSchema = Type.Object({
  id: nonEmptyString(
    "Stable id for this question, echoed verbatim in the answer so the model can map the selection back.",
  ),
  question: nonEmptyString("The question to ask the user"),
  context: nonEmptyString(
    "What task or decision this question is about — the context the user needs to make an informed choice " +
      "(task description, file being edited, command being run, etc.) (required, non-empty)",
  ),
  options: Type.Array(AskOptionSchema, {
    minItems: 1,
    description:
      "List of options for the user to choose from (required, at least one; each option needs a label and a description)",
  }),
  allowMultiple: Type.Boolean({
    description:
      "Allow selecting multiple options for this question (required; true only for a genuine multi-select, otherwise false)",
  }),
});

const AskUserParametersSchema = Type.Object({
  questions: Type.Array(AskQuestionSchema, {
    minItems: 1,
    description: "One or more questions to ask the user, answered in order",
  }),
});

function buildToolResult(
  answers: AskUserAnswer[],
  cancelled: boolean,
): AgentToolResult<AskUserDetails> {
  if (cancelled) {
    return {
      content: [
        { type: "text", text: JSON.stringify({ answers, cancelled: true }) },
      ],
      details: { answers, cancelled: true },
    };
  }
  return {
    content: [{ type: "text", text: JSON.stringify({ answers }) }],
    details: { answers, cancelled: false },
  };
}

export async function executeAskUser(
  ctx: ExtensionToolContext,
  signal: AbortSignal | undefined,
  params: AskUserParams,
  onUpdate: AgentToolUpdateCallback<AskUserDetails> | undefined,
): Promise<AgentToolResult<AskUserDetails>> {
  void ctx;
  const normalized = normalizeQuestions(params);

  assertUniqueQuestions(normalized);
  assertUniqueOptionLabels(normalized);

  if (!askStore.hasUi) throw new Error(buildPlainTextPrompt(normalized));

  const { answers, cancelled } = await askStore.run(
    normalized,
    signal,
    (text, details) =>
      onUpdate?.({ content: [{ type: "text", text }], details }),
  );

  return buildToolResult(answers, cancelled);
}

export const askUserTool: ToolDefinition<
  typeof AskUserParametersSchema,
  AskUserDetails
> = {
  name: ASK_TOOL_NAME,
  label: "Ask User",
  description:
    "Ask the user one or more multiple-choice questions and receive their selections. " +
    "Every field is required (no optional fields): each question carries a stable `id` (echoed in the answer), " +
    "a `question` text, a `context`, `options` (at least one; each with a `label` and a `description`), " +
    "and a boolean `allowMultiple`. A call missing any field, a question with no options, or an option missing " +
    "its label/description is rejected with an error. " +
    "Questions are answered in order; each answer returns the selected option labels in `selected` " +
    "and optional freeform text in `custom` (omitted when unused). " +
    "The tool blocks until the user answers in the app's composer panel; cancellation rides the turn's abort " +
    "signal or the composer's Cancel control. Use when the user's intent is ambiguous or a decision requires " +
    "explicit user input.",
  promptSnippet:
    "Ask the user one or more multiple-choice questions (answered in order) in the app's composer and receive their selections",
  promptGuidelines: [
    "Use ask-user when the user's intent is ambiguous, when a decision requires explicit user input, or when multiple valid options exist.",
    "Batch related questions into one call when they concern the same decision; they are answered in order.",
    "Fill every required field — `id`, `question`, `context`, `options` (each option has a non-empty `label` and `description`), and `allowMultiple`; no field is optional and a missing field fails the call.",
    "Give each question a stable `id` and list the recommended option first with its label suffixed ' (Recommended)'.",
    "The result's `answers` array echoes each question's `id` with selected option labels in `selected` and optional freeform text in `custom`.",
    "The panel replaces the message composer while the answer is pending; the user can pick an option, type an answer of their own (Tab), or attach extra context (Ctrl+G).",
  ],

  executionMode: "sequential",
  parameters: AskUserParametersSchema,

  async execute(_toolCallId, params, signal, onUpdate, ctx) {
    return executeAskUser(ctx, signal, params, onUpdate);
  },
};
