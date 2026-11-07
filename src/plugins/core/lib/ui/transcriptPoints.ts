/**
 * Where the log has a point to jump between.
 *
 * The transcript list draws every item in a fixed number of rows, so a jump
 * target is the row an item starts at. The points a reader walks are the turns
 * of the conversation — what someone asked and what the agent said — while a
 * tool row is only ever part of the answer above it.
 */
import type { TranscriptItem } from "../agent/transcriptState";

const TRANSCRIPT_ROW_STRIDE = 2;

function isConversationPoint(item: TranscriptItem): boolean {
  return item.kind === "user" || item.kind === "assistant";
}

/** The rows of the conversation points, in the order the log shows them. */
export function transcriptPointRows(
  items: readonly TranscriptItem[],
): number[] {
  const rows = new Set<number>();
  items.forEach((item, index) => {
    if (isConversationPoint(item)) rows.add(index * TRANSCRIPT_ROW_STRIDE);
  });
  return [...rows].sort((a, b) => a - b);
}
