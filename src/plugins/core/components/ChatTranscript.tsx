import { type JSX } from "react";
import type { EventPayload } from "@gpuix/native";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import { ScrollView } from "./ScrollView";
import { PAGE_INSET } from "../lib/ui/transcriptLayout";

export interface ChatTranscriptProps {
  listRef: { current: PublicInstance | null };

  onVisibleRange?: (event: EventPayload) => void;

  followTop: boolean;

  summaryRows: JSX.Element[];

  transcriptRows: JSX.Element[];
}

function scrollStyle(): StyleDesc {
  return {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
    gap: 0,
    overflow: "hidden",
    marginLeft: -PAGE_INSET,
    marginRight: -PAGE_INSET,
  };
}

export function ChatTranscript(props: ChatTranscriptProps): JSX.Element {
  return (
    <ScrollView
      listRef={props.listRef}
      onVisibleRange={props.onVisibleRange}
      follow={props.followTop ? "top" : "end"}
      style={scrollStyle()}
    >
      {props.summaryRows.length > 0 ? props.summaryRows : props.transcriptRows}
    </ScrollView>
  );
}
