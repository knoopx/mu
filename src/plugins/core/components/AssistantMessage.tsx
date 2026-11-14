import { Message, MessageContent, useAdwaita } from "adwaita-gpuix";
import type { JSX } from "react";
import type { GpuixTheme, StyleDesc } from "@gpuix/react";

import { Markdown } from "./Markdown";
import { ProgramFence } from "../../openui/components/ProgramFence";
import { replyBlocks } from "../../openui/lib/fences/read";
import { PAGE_INSET } from "../lib/ui/transcriptLayout";
import { proseMeasure } from "../lib/ui/tokens";
import { TurnStatsLine } from "./TurnStats";
import { buildNativeTheme, mutedText } from "../lib/ui/theme";

import type { TranscriptItem } from "../lib/agent/transcriptState";
import type { TurnStats } from "../lib/agent/turnStats";

type AssistantTranscriptItem = Extract<TranscriptItem, { kind: "assistant" }>;

export interface AssistantMessageProps {
  item: AssistantTranscriptItem;

  stats?: TurnStats;
  style?: Partial<StyleDesc>;

  /** Which reply this is among the conversation's replies: what a `ui` block's state key is made of. */
  uiMessage?: number;

  /** A user message follows this reply: its questions have already been answered. */
  answered?: boolean;
}

/**
 * A reply, in order: its prose in the markdown block, and its `ui` blocks as
 * screens the human can use.
 *
 * A block is taken out of the prose rather than left in it — the reference
 * plugin hides BB's code block behind the UI it renders, and mu hands the prose
 * to a markdown element that would otherwise draw the source as a code block.
 * A reply with no block keeps one markdown element, exactly as before.
 */
function bodyOf(
  item: AssistantTranscriptItem,
  props: AssistantMessageProps,
  /** The prose of a reply is capped to a reading measure; the `ui` blocks beside
   *  it are not, because a screen the human operates takes the whole column. */
  measure: number,
): JSX.Element | null {
  if (!item.text) return null;
  const blocks = replyBlocks(item.text, item.streaming);
  if (!blocks.hasFence)
    return (
      <Markdown source={item.text} style={{ padding: 0, maxWidth: measure }} />
    );

  const message = props.uiMessage ?? 0;
  return (
    <>
      {blocks.segments.map((segment, index) =>
        segment.kind === "prose" ? (
          <Markdown
            key={`prose-${String(index)}`}
            source={segment.text}
            style={{ padding: 0, maxWidth: measure }}
          />
        ) : (
          <ProgramFence
            key={`ui-${String(index)}`}
            message={message}
            fence={segment.fence}
            answered={props.answered === true}
          />
        ),
      )}
    </>
  );
}

function ReasoningBlock({ body }: { body: string }): JSX.Element {
  const t = useAdwaita();
  const base = buildNativeTheme(t);

  const theme: GpuixTheme = { ...base, text: mutedText(t) };
  return (
    <Markdown
      source={body}
      theme={theme}
      style={{
        padding: 0,
        flexShrink: 1,
        minWidth: 0,
        maxWidth: proseMeasure(t),
      }}
    />
  );
}

export function AssistantMessage(props: AssistantMessageProps): JSX.Element {
  const t = useAdwaita();
  const { item } = props;
  const stats = props.stats;
  const showStats = stats !== undefined && stats.settled;
  return (
    <Message
      style={{
        paddingLeft: PAGE_INSET,
        paddingRight: PAGE_INSET,
        ...props.style,
      }}
    >
      <MessageContent style={{ gap: t.space.md }}>
        {item.reasoning ? <ReasoningBlock body={item.reasoning} /> : null}
        {bodyOf(item, props, proseMeasure(t))}
        {showStats && stats !== undefined ? (
          <TurnStatsLine stats={stats} />
        ) : null}
      </MessageContent>
    </Message>
  );
}
