import { T, useAdwaita } from "adwaita-gpuix";
import { isWriteTool } from "../lib/agent/builtInTools";
import { pathTextOf } from "../lib/agent/toolInput";
import type { JSX } from "react";
import type { StyleDesc } from "@gpuix/react";

import { buildNativeTheme, mutedText } from "../lib/ui/theme";
import {
  toolBand,
  previewLineHeight,
  toolPreviewWrap,
} from "../lib/ui/transcriptLayout";
import { toolText } from "../lib/ui/toolRows";

import type { ToolTranscriptItem } from "../lib/agent/transcriptState";

export const MAX_WRITE_PREVIEW_LINES = 12;

/** The file as it is displayed: tabs widened, trailing blank lines dropped. */
function contentLines(content: string): string[] {
  const lines = content.split("\n").map((line) => line.replace(/\t/g, "  "));
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  return lines;
}

function lineCount(total: number): string {
  return `${total} ${total === 1 ? "line" : "lines"}`;
}

export interface WritePreviewData {
  path: string;
  lines: string[];
  total: number;
  truncated: boolean;
  streaming: boolean;
  caption: string;
}

/**
 * The file a write is making, read out of the call's own arguments: they are
 * in the log from the moment the model opens the call, so the text of the file
 * is on screen while it is still being written.
 */
export function writePreviewOf(
  item: ToolTranscriptItem,
): WritePreviewData | undefined {
  if (!isWriteTool(item.name)) return undefined;
  const args = item.args ?? {};
  const lines = contentLines(
    typeof args.content === "string" ? args.content : "",
  );
  if (lines.length === 0) return undefined;

  const streaming = item.status === "running";
  const total = lines.length;
  // While the call streams, the panel follows the pen: the newest lines are the
  // ones being written now, so the tail is shown and scrolls. A finished write
  // reads from the top, the way you would read the file.
  const kept = streaming
    ? lines.slice(-MAX_WRITE_PREVIEW_LINES)
    : lines.slice(0, MAX_WRITE_PREVIEW_LINES);
  const truncated = total > kept.length;
  const hidden = total - kept.length;

  // While the call streams the count is the point: the file is that long and
  // growing. Only once it is written does the panel say what it cannot show.
  const caption = streaming
    ? truncated
      ? `writing · ${lineCount(total)} so far · last ${kept.length} shown`
      : `writing · ${lineCount(total)} so far`
    : truncated
      ? `${lineCount(total)} · ${hidden} not shown`
      : lineCount(total);

  return {
    path: pathTextOf(args).trim(),
    lines: kept,
    total,
    truncated,
    streaming,
    caption,
  };
}

export interface WritePreviewProps {
  preview: WritePreviewData;
  style?: Partial<StyleDesc>;
}

export function WritePreview({
  preview,
  style,
}: WritePreviewProps): JSX.Element {
  const t = useAdwaita();
  const lineHeight = previewLineHeight(t);
  const wrap = toolPreviewWrap(t, style);
  const card: StyleDesc = { ...toolBand(t), flexShrink: 0 };

  return (
    <div style={wrap}>
      <div style={card}>
        <code
          code={preview.lines.join("\n")}
          path={preview.path === "" ? undefined : preview.path}
          theme={buildNativeTheme(t)}
          style={{
            maxHeight: MAX_WRITE_PREVIEW_LINES * lineHeight,
            overflow: "hidden",
            flexShrink: 0,
            fontSize: t.type.caption,
            lineHeight,
            fontFamily: t.type.fontFamilyMono,
            color: t.color.text.primary,
          }}
        />
      </div>
      <T
        size="caption"
        color={mutedText(t)}
        style={{ ...toolText(t), pointerEvents: "none" }}
      >
        {preview.caption}
      </T>
    </div>
  );
}
