import type { GpuixTheme, StyleDesc } from "@gpuix/react";
import { useAdwaita } from "adwaita-gpuix";
import { buildNativeTheme } from "../lib/ui/theme";
import type { EventPayload } from "@gpuix/native";
import type { JSX } from "react";

export interface MarkdownProps {
  source?: string;
  paddingX?: number;
  paddingY?: number;

  theme?: GpuixTheme;
  onLinkClick?: (url: string) => void;
  style?: Partial<StyleDesc>;
}

export function Markdown(props: MarkdownProps): JSX.Element {
  const t = useAdwaita();
  const built: GpuixTheme = {
    ...buildNativeTheme(t),
    ...props.theme,
  };

  const style: StyleDesc = {
    padding: (props.paddingX ?? 1) * 4,
    paddingTop: (props.paddingY ?? 1) * 4,
    paddingBottom: (props.paddingY ?? 1) * 4,
    ...props.style,
  };
  return (
    <markdown
      source={props.source ?? ""}
      theme={built}
      onLinkClick={
        props.onLinkClick
          ? (e: EventPayload) => props.onLinkClick!(e.value ?? "")
          : undefined
      }
      style={style}
    />
  );
}
