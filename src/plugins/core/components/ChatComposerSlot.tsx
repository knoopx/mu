import { type JSX } from "react";
import { useAdwaita } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";
import { Composer, type ComposerProps } from "./composer/Composer";
import { StateSpinner } from "./StateSpinner";
import {
  ComposerAttachments,
  type ComposerAttachment,
} from "./composer/attachments";
import { AskComposer } from "../../interaction/components/AskComposer";
import type { AskRequest, AskResponse } from "../../interaction/types";
import { MARK_HANG, STATE_GLYPH } from "../lib/ui/tokens";

export interface ChatComposerSlotProps {
  gap: number;

  ask: {
    request: AskRequest | null;

    onAnswer: (response: AskResponse) => void;

    onCancel: () => void;
  };

  attachments: ComposerAttachment[];

  pasting: boolean;

  onRemoveAttachment: (id: string) => void;

  composer: ComposerProps;
}

/**
 * A running session says so with a spinner beside the composer, not with a line
 * of prose at the bottom of the log.
 *
 * The mark hangs `MARK_HANG` out of the page inset — the column every mark in
 * the log stands in, where a tool header's glyph hangs — so the window keeps one
 * gutter of marks down its whole height. The box never moves: a mark hung that
 * far left contributes `STATE_GLYPH - MARK_HANG` to its row, and `busyBox` pays
 * the difference back, so the composer keeps the width and the x it had a moment
 * before. The composer's fill clips its own children, so the mark stands in this
 * row rather than inside the box.
 */
const busyRow: StyleDesc = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  alignSelf: "stretch",
  gap: 0,
  flexShrink: 0,
  minWidth: 0,
};

const busyMark: StyleDesc = {
  flexShrink: 0,
  width: STATE_GLYPH,
  marginLeft: -MARK_HANG,
};

/**
 * The box steps back to the ink column the mark hung out of, and takes the row's
 * width as it took the column's: in a row a stretched column no longer grows
 * across the line on its own, so the mark's row has to give it the slack.
 */
const busyBox: StyleDesc = {
  marginLeft: MARK_HANG - STATE_GLYPH,
  flexGrow: 1,
  flexBasis: 0,
  minWidth: 0,
};

function ComposerWithBusyMark(props: { composer: ComposerProps }): JSX.Element {
  const { composer } = props;
  if (composer.isStreaming === false) return <Composer {...composer} />;
  return (
    <div style={busyRow}>
      <StateSpinner style={busyMark} />
      <Composer {...composer} style={{ ...composer.style, ...busyBox }} />
    </div>
  );
}

export function ChatComposerSlot(props: ChatComposerSlotProps): JSX.Element {
  const t = useAdwaita();
  const { ask } = props;
  if (ask.request !== null)
    return (
      <AskComposer
        request={ask.request}
        onAnswer={ask.onAnswer}
        onCancel={ask.onCancel}
        style={{ marginTop: props.gap }}
      />
    );
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: t.space.sm,
        marginTop: props.gap,
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      <ComposerAttachments
        attachments={props.attachments}
        busy={props.pasting}
        onRemove={props.onRemoveAttachment}
      />
      <ComposerWithBusyMark composer={props.composer} />
    </div>
  );
}
