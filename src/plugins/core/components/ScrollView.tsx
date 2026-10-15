import type { ReactNode, Ref } from "react";
import type { EventPayload } from "@gpuix/native";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import type { JSX } from "react";

export interface ScrollViewProps {
  children: ReactNode;
  follow?: "auto" | "end" | "top";
  primary?: boolean;
  overscroll?: boolean;
  listRef?: Ref<PublicInstance>;
  onVisibleRange?: (event: EventPayload) => void;

  estimatedItemHeight?: number;
  style?: Partial<StyleDesc>;
}

export function ScrollView(props: ScrollViewProps): JSX.Element {
  const follow = props.follow ?? "auto";
  return (
    <virtual-list
      ref={props.listRef}
      onVisibleRange={props.onVisibleRange}
      estimatedItemHeight={props.estimatedItemHeight ?? 40}
      followTail={follow === "end"}
      alignment={follow === "top" ? "top" : "bottom"}
      style={props.style}
    >
      {props.children}
    </virtual-list>
  );
}
