import { resolve } from "node:path";
import { formatSize } from "@earendil-works/pi-coding-agent";
import { useProjectSource, type ProjectSource } from "./ProjectSource";
import { isRenderableImage, useAdwaita } from "adwaita-gpuix";
import type { JSX } from "react";
import type { StyleDesc } from "@gpuix/react";

import { buildNativeTheme } from "../lib/ui/theme";
import { PREVIEW_IMAGE_HEIGHT, PREVIEW_IMAGE_WIDTH } from "../lib/ui/tokens";
import {
  previewLineHeight,
  toolBand,
  toolPreviewWrap,
} from "../lib/ui/transcriptLayout";

import type { ToolTranscriptItem } from "../lib/agent/transcriptState";

/** How many lines of a file the log quotes before it says "more lines". */
const MAX_PREVIEW_LINES = 8;

const CONTINUATION_NOTICE = /^\[(\d+ more lines|Showing lines|Line \d+ is)/;

interface ReadArgs {
  path: string;
  offset?: number;
  limit?: number;
}

function readArgsOf(item: ToolTranscriptItem): ReadArgs | undefined {
  const args = item.args ?? {};
  const path = args.path ?? args.file_path ?? args.filePath ?? args.file;
  if (typeof path !== "string" || path.trim() === "") return undefined;
  const offset =
    typeof args.offset === "number" && args.offset > 0
      ? Math.floor(args.offset)
      : undefined;
  const limit =
    typeof args.limit === "number" && args.limit > 0
      ? Math.floor(args.limit)
      : undefined;
  return { path, offset, limit };
}

function sliceFromOutput(output: string): string[] {
  const lines = output.split("\n");
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  while (
    lines.length > 0 &&
    CONTINUATION_NOTICE.test(lines[lines.length - 1].trim())
  )
    lines.pop();
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  return lines;
}

function sliceFromSource(
  source: ProjectSource,
  args: ReadArgs,
): string[] | undefined {
  try {
    const text = source.readFile(resolve(process.cwd(), args.path));
    if (text === null) return undefined;
    const all = text.split("\n");
    const start = Math.max(0, (args.offset ?? 1) - 1);
    const end =
      args.limit === undefined
        ? all.length
        : Math.min(start + args.limit, all.length);
    if (start >= all.length) return undefined;
    return all.slice(start, end);
  } catch {
    return undefined;
  }
}

function ellipsize(
  lines: string[],
  max: number,
): { lines: string[]; truncated: boolean } {
  if (lines.length <= max) return { lines, truncated: false };
  return {
    lines: [...lines.slice(0, Math.max(1, max - 1)), "…"],
    truncated: true,
  };
}

export interface ReadPreviewData {
  path: string;
  from: number;
  to: number;
  caption: string;
  kind: "text" | "image";
  lines: string[];
  truncated: boolean;
  image?: { src: string; mimeType: string; bytes: number };
}

function oneLine(value: string): string {
  const line =
    value
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l !== "")[0] ?? "";
  return line;
}

export function readPreviewOf(
  item: ToolTranscriptItem,
  source: ProjectSource,
): ReadPreviewData | undefined {
  const args = readArgsOf(item);
  if (args === undefined) return undefined;
  const from = args.offset ?? 1;

  if (item.status === "error") {
    const detail = oneLine(item.output);
    return {
      path: args.path,
      from,
      to: from,
      caption:
        detail === ""
          ? `${args.path} · unreadable`
          : `${args.path} · ${detail}`,
      kind: "text",
      lines: [],
      truncated: false,
    };
  }

  if (item.image !== undefined) {
    return {
      path: args.path,
      from,
      to: from,
      caption: `${args.path} · ${item.image.mimeType} · ${formatSize(item.image.bytes)}`,
      kind: "image",
      lines: [],
      truncated: false,
      image: item.image,
    };
  }

  if (item.status === "running") return undefined;

  const fromResult = sliceFromOutput(item.output);
  const lines =
    fromResult.length > 0 ? fromResult : sliceFromSource(source, args);
  if (lines === undefined || lines.length === 0) return undefined;

  const kept = ellipsize(lines, MAX_PREVIEW_LINES);
  return {
    path: args.path,
    from,
    to: from + lines.length - 1,
    caption: `${args.path} · lines ${from}\u2013${from + lines.length - 1}`,
    kind: "text",
    lines: kept.lines,
    truncated: kept.truncated,
  };
}

export interface ReadPreviewProps {
  item: ToolTranscriptItem;
  preview: ReadPreviewData;
  style?: Partial<StyleDesc>;
}

export function ReadPreview({
  item,
  preview,
  style,
}: ReadPreviewProps): JSX.Element | null {
  const t = useAdwaita();
  const lineHeight = previewLineHeight(t);
  const wrap = toolPreviewWrap(t, style);
  const card: StyleDesc = { ...toolBand(t), flexShrink: 0 };

  const tile: StyleDesc = {
    width: PREVIEW_IMAGE_WIDTH,
    height: PREVIEW_IMAGE_HEIGHT,
    borderRadius: t.radius.sm,
    flexShrink: 0,
  };

  const showImage =
    preview.kind === "image" &&
    preview.image !== undefined &&
    isRenderableImage(preview.image.src, preview.image.mimeType);

  return (
    <div style={wrap}>
      {showImage && preview.image !== undefined ? (
        <img
          src={preview.image.src}
          alt={preview.path}
          objectFit="contain"
          style={tile}
        />
      ) : null}
      {preview.kind === "text" && preview.lines.length > 0 ? (
        <div style={card}>
          <code
            code={preview.lines.join("\n")}
            path={preview.path}
            theme={buildNativeTheme(t)}
            style={{
              maxHeight: MAX_PREVIEW_LINES * lineHeight,
              overflow: "hidden",
              flexShrink: 0,
              fontSize: t.type.caption,
              lineHeight,
              fontFamily: t.type.fontFamilyMono,
              color: t.color.text.primary,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
