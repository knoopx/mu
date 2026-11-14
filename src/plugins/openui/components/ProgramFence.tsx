/**
 * One `ui` block of a reply, drawn where the block stands.
 *
 * This is the path the reference plugin's README opens with: the agent writes
 * the screen inline in its answer, and the reply shows it. A block costs no
 * extra model call, and it draws while the reply streams — an unterminated block
 * is parsed as the longest prefix that compiles, and the last frame that drew is
 * kept so a screen never blanks itself mid-token.
 *
 * The block's program is held in the store from an effect rather than during the
 * paint: the store is what the renderer reads, and a store may not be written
 * from the middle of a render. So a block that has just opened shows a quiet
 * line for one frame, which is what the reference shows too — a placeholder,
 * never an error.
 */

import { useEffect } from "react";
import type { JSX } from "react";
import { T, useAdwaita } from "adwaita-gpuix";

import { mutedText } from "../../core/lib/ui/theme";
import { useProgram } from "../hooks/useProgram";
import { innerGap } from "../lib/tokens";
import { fenceKey, holdFence } from "../lib/fences/store";
import type { ReplyFence } from "../lib/fences/read";
import { ProgramScreen } from "./ProgramScreen";

export function ProgramFence(props: {
  /** Which reply holds this block. */
  message: number;

  /** The block itself: its source, its place, and what became of its delimiter. */
  fence: ReplyFence;

  /** The reply has been answered: the block's questions have gone out with the message that was sent. */
  answered: boolean;
}): JSX.Element {
  const t = useAdwaita();
  const { message, fence } = props;
  const streaming = fence.status === "streaming";
  const name = fenceKey(message, fence.fence);
  const held = useProgram(name);

  // Held after the paint, because holding it during the paint would write the
  // store while the log is rendering. What the store holds is one of the
  // dependencies: a block whose program was evicted to make room for a newer one
  // is held again the moment its message is painted.
  useEffect(() => {
    holdFence(message, fence);
  }, [message, fence.source, fence.status, held?.source, held?.streaming]);

  if (fence.source.trim() === "" || held === undefined) {
    // A quiet line, never an error: the block has opened and the screen has not
    // arrived, which is one frame for a finished block and a moment for one the
    // reply is still writing.
    return (
      <div style={{ display: "flex", minWidth: 0 }}>
        <T
          size="caption"
          color={mutedText(t)}
          clamp={1}
          style={{ minWidth: 0 }}
        >
          {streaming || fence.source.trim() === ""
            ? "a screen is being drawn…"
            : "nothing drew from this block"}
        </T>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        gap: innerGap(t),
      }}
    >
      <ProgramScreen name={name} answered={props.answered} />
      {fence.status === "closed" || streaming ? null : (
        <T
          size="caption"
          color={mutedText(t)}
          clamp={2}
          style={{ minWidth: 0 }}
        >
          {"the reply ended before the block closed"}
        </T>
      )}
    </div>
  );
}
