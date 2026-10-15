import { Message, MessageContent, useAdwaita } from "adwaita-gpuix";
import type { JSX } from "react";
import type { GpuixTheme, StyleDesc } from "@gpuix/react";

import { Markdown } from "./Markdown";
import { PAGE_INSET } from "../lib/ui/transcriptLayout";
import { TurnStatsLine } from "./TurnStats";
import { buildNativeTheme, mutedText } from "../lib/ui/theme";

import type { TranscriptItem } from "../lib/agent/transcriptState";
import type { TurnStats } from "../lib/agent/turnStats";

type AssistantTranscriptItem = Extract<TranscriptItem, { kind: "assistant" }>;

export interface AssistantMessageProps {
  item: AssistantTranscriptItem;

  stats?: TurnStats;
  style?: Partial<StyleDesc>;
}

function ReasoningBlock({ body }: { body: string }): JSX.Element {
  const t = useAdwaita();
  const base = buildNativeTheme(t);

  const theme: GpuixTheme = { ...base, text: mutedText(t) };
  return (
    <Markdown
      source={body}
      theme={theme}
      style={{ padding: 0, flexShrink: 1, minWidth: 0 }}
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
        {item.text ? (
          <Markdown source={item.text} style={{ padding: 0 }} />
        ) : null}
        {showStats && stats !== undefined ? (
          <TurnStatsLine stats={stats} />
        ) : null}
      </MessageContent>
    </Message>
  );
}
