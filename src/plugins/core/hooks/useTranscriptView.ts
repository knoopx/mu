import { useMemo } from "react";
import type { EventPayload } from "@gpuix/native";
import type { PublicInstance } from "@gpuix/react";
import {
  conversationStats,
  turnStatsById,
  type ConversationStats,
  type SessionClock,
  type TurnStats,
} from "../lib/agent/turnStats";
import type { TranscriptItem } from "../lib/agent/transcriptState";
import type { SessionPreviewData } from "../lib/session/sessionList";
import type { ComposerMode } from "../lib/composer/mode";
import { useListJump } from "../lib/ui/listJump";
import {
  transcriptLastRow,
  transcriptPointRows,
} from "../lib/ui/transcriptPoints";

/**
 * What the log is showing, and how to move through it.
 *
 * The window draws either the live session or the preview of a session picked
 * out of the list, and everything under the composer — the rows, the figures
 * in the status bar, the points Tab-style jumping walks between — is read from
 * whichever of the two is on screen. The figures are that session's own: its
 * turns, its tokens and its span, read at the clock the window keeps so the one
 * in flight keeps moving.
 */
export interface TranscriptViewOptions {
  items: readonly TranscriptItem[];

  preview: SessionPreviewData | null;

  sessionStart: number | undefined;

  /** The moment the figures are read at, and whether a run is in flight to move
   * them. A story pins the moment so a scene's numbers never drift. */
  clock: SessionClock;

  mode: ComposerMode;

  askOpen: boolean;

  listRef: { current: PublicInstance | null };

  followTail(follow: boolean): void;
}

export interface TranscriptView {
  source: readonly TranscriptItem[];

  stats: Map<string, TurnStats>;

  conversation: ConversationStats | null;

  pointRows: readonly number[];

  onVisibleRange: (event: EventPayload) => void;
}

export function useTranscriptView(
  options: TranscriptViewOptions,
): TranscriptView {
  const {
    items,
    preview,
    sessionStart,
    clock,
    mode,
    askOpen,
    listRef,
    followTail,
  } = options;

  const source: readonly TranscriptItem[] =
    preview === null ? items : preview.items;

  const stats = useMemo(() => turnStatsById(source), [source]);
  const { now, running } = clock;
  const conversation = useMemo(
    () =>
      conversationStats(
        source,
        { now, running },
        preview?.startTs ?? sessionStart,
      ),
    [source, now, running, preview, sessionStart],
  );
  const pointRows = useMemo(() => transcriptPointRows(source), [source]);
  const lastRow = transcriptLastRow(source);

  const jump = useListJump({
    listRef,
    targets: pointRows,
    lastRow,
    enabled: jumpingIsOpen(mode, askOpen, pointRows.length, lastRow),
    bindings: {
      prev: "transcript.prevPoint",
      next: "transcript.nextPoint",
      start: "transcript.start",
      end: "transcript.end",
    },
    onJump: (_target, isEnd) => followTail(isEnd),
  });

  return {
    source,
    stats,
    conversation,
    pointRows,
    onVisibleRange: jump.onVisibleRange,
  };
}

/**
 * Jumping belongs to the log itself: a draft is being written (not a command
 * or a panel), no question is waiting in the composer slot, and the log has
 * somewhere to move — more than one point to walk between, or more than one row
 * to jump an end of.
 */
function jumpingIsOpen(
  mode: ComposerMode,
  askOpen: boolean,
  pointCount: number,
  lastRow: number,
): boolean {
  return mode.kind === "draft" && !askOpen && (pointCount > 1 || lastRow > 0);
}
