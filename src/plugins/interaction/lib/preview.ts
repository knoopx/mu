/**
 * The header line of an ask call: how many questions it asked, and how many were
 * answered. It belongs to the plugin, not to the log's row, because the words
 * come from what an ask call carries — the same reason every other plugin writes
 * its own preview.
 */

import type { AskQuestion } from "../types";
import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import { headerSnippet } from "../../core/lib/agent/toolPreview";
import { askDetailsOf } from "../components/AskResultRows";

function questionsOf(item: ToolTranscriptItem): Partial<AskQuestion>[] {
  const questions = item.args?.questions;
  if (!Array.isArray(questions)) return [];
  return questions.filter(
    (question): question is Partial<AskQuestion> =>
      typeof question === "object" && question !== null,
  );
}

export function askToolPreviewOf(item: ToolTranscriptItem): string {
  const questions = questionsOf(item);
  const label = `${questions.length} ${questions.length === 1 ? "question" : "questions"}`;

  const answers = askDetailsOf(item)?.answers ?? [];
  if (answers.length > 0) return `${label} · answered ${answers.length}`;

  const text = questions.length === 1 ? questions[0].question : undefined;
  if (typeof text === "string" && text.trim() !== "")
    return headerSnippet(`${label} · ${text.trim()}`);

  return label;
}
