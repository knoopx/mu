import { type JSX } from "react";
import { useAdwaita, type AdwaitaTheme } from "adwaita-gpuix";
import type { EventPayload } from "@gpuix/native";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import { ScrollView } from "./ScrollView";
import {
  CancellableLoader,
  type CancellableLoaderHandle,
} from "./CancellableLoader";
import { conversationGap, PAGE_INSET } from "../lib/ui/transcriptLayout";

export interface ChatTranscriptProps {
  listRef: { current: PublicInstance | null };

  onVisibleRange?: (event: EventPayload) => void;

  followTop: boolean;

  summaryRows: JSX.Element[];

  transcriptRows: JSX.Element[];

  showLoader: boolean;

  loaderRef: { current: CancellableLoaderHandle | null };

  onAbort: () => void;
}

function loaderRows(
  t: AdwaitaTheme,
  loaderRef: ChatTranscriptProps["loaderRef"],
  onAbort: () => void,
): JSX.Element[] {
  return [
    <div
      key="loader-gap"
      style={{ height: conversationGap(t), width: "100%", flexShrink: 0 }}
    />,
    <CancellableLoader
      key="loader"
      ref={loaderRef}
      message="Working"
      onAbort={onAbort}
      style={{
        flexShrink: 0,
        paddingLeft: PAGE_INSET,
        paddingRight: PAGE_INSET,
      }}
    />,
  ];
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
  const t = useAdwaita();
  return (
    <ScrollView
      listRef={props.listRef}
      onVisibleRange={props.onVisibleRange}
      follow={props.followTop ? "top" : "end"}
      style={scrollStyle()}
    >
      {props.summaryRows.length > 0 ? props.summaryRows : props.transcriptRows}
      {props.showLoader ? loaderRows(t, props.loaderRef, props.onAbort) : null}
    </ScrollView>
  );
}
