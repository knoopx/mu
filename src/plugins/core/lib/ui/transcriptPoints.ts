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

/**
 * The row the last item starts on: the end of the log.
 *
 * A streaming run hangs a loader below the items, but asking the list for the
 * row of its last item is already a request past what fits, so the list lands
 * on its bottom either way and the end stays the items'.
 *
 * A log with a single row has no end past its first row and answers 0.
 */
export function transcriptLastRow(items: readonly TranscriptItem[]): number {
  return items.length === 0 ? 0 : (items.length - 1) * TRANSCRIPT_ROW_STRIDE;
}
