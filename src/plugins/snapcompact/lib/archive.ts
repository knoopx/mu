import type { SessionEntry } from "@earendil-works/pi-coding-agent";

import { ARCHIVE_KEY } from "../constants";
import type { SnapcompactArchive, SnapcompactDetails } from "../types";

/** A session file written by an older mu, a hand-edited entry, or pi's own
 *  compaction: only a `details` that really carries a frame archive is one of
 *  mu's. Everything downstream — replay, the next pass, the transcript row —
 *  asks this before it reads a field. */
export function isSnapcompactDetails(
  details: unknown,
): details is SnapcompactDetails {
  if (typeof details !== "object" || details === null) return false;
  const archive = (details as Record<string, unknown>)[ARCHIVE_KEY];
  return (
    typeof archive === "object" &&
    archive !== null &&
    Array.isArray((archive as { frames?: unknown }).frames)
  );
}

/** The archive stored in a compaction entry's details. */
export const archiveOf = (details: SnapcompactDetails): SnapcompactArchive =>
  details[ARCHIVE_KEY];

/**
 * The newest snapcompact compaction on the branch.
 *
 * Two readers of this, for two reasons. The next pass asks for the archive it
 * unfolds — the package re-renders an accumulated history rather than
 * summarising a summary — and a replay asks for the frames to attach, because a
 * resumed session has nothing but the session file to rebuild them from.
 */
export function latestSnapcompactDetails(
  entries: readonly SessionEntry[],
): SnapcompactDetails | undefined {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry?.type !== "compaction") continue;
    if (isSnapcompactDetails(entry.details)) return entry.details;
  }
  return undefined;
}
