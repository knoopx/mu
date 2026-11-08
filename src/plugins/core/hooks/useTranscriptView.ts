import { useMemo } from "react";
import type { EventPayload } from "@gpuix/native";
import type { PublicInstance } from "@gpuix/react";
import {
  conversationStats,
  turnStatsById,
  type ConversationStats,
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
 * whichever of the two is on screen.
 */
export interface TranscriptViewOptions {
  items: readonly TranscriptItem[];

  preview: SessionPreviewData | null;

  sessionStart: number | undefined;

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
  const { items, preview, sessionStart, mode, askOpen, listRef, followTail } =
    options;

  const source: readonly TranscriptItem[] =
    preview === null ? items : preview.items;

  const stats = useMemo(() => turnStatsById(source), [source]);
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
    conversation: conversationStats(source, preview?.startTs ?? sessionStart),
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
