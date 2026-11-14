import type {
  AskOption,
  AskQuestion,
  AskResponse,
  AskUserAnswer,
  AskUserParams,
} from "../types";

export function normalizeQuestions(params: AskUserParams): AskQuestion[] {
  return params.questions.map((question) => ({
    id: question.id.trim(),
    question: question.question.trim(),
    context: question.context.trim(),
    options: question.options.map((option) => ({
      label: option.label.trim(),
      description: option.description.trim(),
    })),
    allowMultiple: question.allowMultiple,
  }));
}

export function assertUniqueQuestions(questions: AskQuestion[]): void {
  const seenQuestionText = new Map<string, string[]>();
  for (const question of questions) {
    const text = question.question.trim();
    const ids = seenQuestionText.get(text) ?? [];
    ids.push(question.id);
    seenQuestionText.set(text, ids);
  }
  for (const [text, ids] of seenQuestionText) {
    if (ids.length > 1) {
      throw new Error(
        `Duplicate question text "${text}" is shared by ${ids.length} questions (${ids.join(", ")}). ` +
          `Each question must have unique text; give the duplicated questions distinct question strings. ` +
          `Call ask-user again with corrected question text.`,
      );
    }
  }
}

export function assertUniqueOptionLabels(questions: AskQuestion[]): void {
  for (const question of questions) {
    const seenLabels = new Map<string, number>();
    for (const option of question.options) {
      seenLabels.set(option.label, (seenLabels.get(option.label) ?? 0) + 1);
    }
    for (const [label, count] of seenLabels) {
      if (count > 1) {
        throw new Error(
          `Duplicate option label "${label}" is used ${count} times in question "${question.id}". ` +
            `Each option label must be unique within a question; give the duplicated options distinct labels. ` +
            `Call ask-user again with corrected options.`,
        );
      }
    }
  }
}

function formatOptionsForMessage(options: AskOption[]): string {
  return options
    .map(
      (option, index) =>
        `${index + 1}. ${option.label} — ${option.description}`,
    )
    .join("\n");
}

export function buildPlainTextPrompt(questions: AskQuestion[]): string {
  const blocks = questions.map((question, index) => {
    const lines = [`${index + 1}. [${question.id}] ${question.question}`];
    if (question.options.length > 0) {
      lines.push("Options:");
      lines.push(formatOptionsForMessage(question.options));
    } else {
      lines.push("(freeform answer)");
    }
    return lines.join("\n");
  });
  return `ask-user has no window to present the questions in. Please answer:\n\n${blocks.join("\n\n")}`;
}

function normalizeOptionalComment(
  text: string | null | undefined,
): string | undefined {
  const trimmed = text?.trim();
  return trimmed ? trimmed : undefined;
}

export function createFreeformResponse(
  text: string | null | undefined,
): AskResponse | null {
  const trimmed = text?.trim();
  return trimmed ? { kind: "freeform", text: trimmed } : null;
}

export function createSelectionResponse(
  selections: string[],
  comment?: string | null,
): AskResponse | null {
  const normalizedSelections = selections
    .map((selection) => selection.trim())
    .filter(Boolean);
  if (normalizedSelections.length === 0) return null;

  const normalizedComment = normalizeOptionalComment(comment);
  return normalizedComment
    ? {
        kind: "selection",
        selections: normalizedSelections,
        comment: normalizedComment,
      }
    : { kind: "selection", selections: normalizedSelections };
}

export function toAnswer(
  question: AskQuestion,
  result: AskResponse,
): AskUserAnswer {
  if (result.kind === "freeform") {
    return { id: question.id, selected: [], custom: result.text };
  }
  const answer: AskUserAnswer = {
    id: question.id,
    selected: result.selections,
  };
  if (result.comment !== undefined) answer.custom = result.comment;
  return answer;
}

export function progressText(index: number, total: number): string {
  return `Waiting for answer to question ${index + 1}/${total}...`;
}
