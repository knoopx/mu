/**
 * The part of a code-quality answer that is not a row.
 *
 * Every tool reads an analyser, says what ran and on what scope, and then
 * either states that the run found nothing usable or prints its findings. Only
 * the findings differ, so the head and the not-ok branch live here: one status
 * table above the data, and one sentence when the run failed, found no
 * analyser, or came back clean.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";

import { blocks, toolResult } from "../../core/lib/agent/toolText";
import type { QualityToolStatus } from "../types";

/** What ran, as one cell: the analyser's name, and the version that answered. */
export const analyzerCell = (name: string, version: string): string =>
  version === "" ? name : `${name} ${version}`;

/** The two keys every details object carries for the not-ok branch. */
export interface QualityAnswer {
  status: QualityToolStatus;
  error: string;
}

/**
 * A run with nothing to print answers with its own reason, or the sentence its
 * tool supplies when the analyser gave none. `null` means the rows follow.
 */
export function answerUnlessOk<T extends QualityAnswer>(
  head: string,
  details: T,
  nothingFound: string,
): AgentToolResult<T> | null {
  if (details.status === "ok") return null;
  return toolResult(
    blocks(head, details.error === "" ? nothingFound : details.error),
    details,
  );
}
