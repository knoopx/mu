/**
 * Draws a diagram call in the transcript: the picture itself, what it measures,
 * and — when the parser refused the source — the line it stopped on.
 *
 * The chips, the notes and the running block are core's. This file owns two
 * things: the words a diagram answer has that no other answer has, and the box
 * a picture is scaled into. That box is a *size* only: a picture gets no fill of
 * its own, so its ink sits on the log like every other row's text does. It is
 * clicked over like every other picture in the log — the diagram is laid out for
 * a canvas far wider than the row, so filling the window is how it is read.
 * The markup is painted in the colours the app is wearing right now, which is
 * why the picture is drawn here and not in the tool.
 */

import type { JSX } from "react";
import { useWindowSize } from "@gpuix/react";
import { useAdwaita, type AdwaitaTheme, type IconName } from "adwaita-gpuix";

import { partsLine } from "../../core/lib/agent/toolText";
import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import { ToolCaptionLine } from "../../core/components/ToolCaptionLine";
import { PAGE_INSET } from "../../core/lib/ui/transcriptLayout";
import { ZoomImage } from "../../core/components/ZoomImage";
import {
  ToolRunning,
  ToolStatusNote,
  ToolUnknownResult,
} from "../../core/components/ToolDataRows";
import {
  toolPreviewLine,
  type ToolPreviewVocabulary,
} from "../../core/lib/agent/toolPreview";
import {
  toolBodyStack,
  type ToolRowCell,
  type ToolRowTone,
} from "../../core/lib/ui/toolRowPaint";
import { buildNativeTheme, mutedText } from "../../core/lib/ui/theme";
import { codeLineBox } from "../../core/lib/ui/tokens";
import {
  DIAGRAM_BOX_HEIGHT,
  DIAGRAM_BOX_WIDTH,
  DIAGRAM_UPSCALE,
  MERMAID_RENDER_TOOL,
  MERMAID_TOOL_NAMES,
} from "../constants";
import {
  diagramName,
  diagramFailureLine,
  mermaidToolViewOf,
} from "../lib/toolView";
import { paintDiagram } from "../lib/palette";
import type { MermaidToolView } from "../lib/toolView";

const RUNNING_TEXT: Record<string, string> = {
  [MERMAID_RENDER_TOOL]: "drawing the diagram",
};

const EMPTY_TEXT: Record<string, string> = {
  [MERMAID_RENDER_TOOL]: "nothing to draw",
};

/** A diagram answer's own words, so the header never has to guess. */
const MERMAID_WORDS: ToolPreviewVocabulary = {
  running: RUNNING_TEXT,
  runningDefault: "drawing the diagram",
  clean: ["empty"],
  empty: EMPTY_TEXT,
  emptyDefault: "nothing to draw",
  stated: {},
};

const MERMAID_STATUS_TONES: Readonly<Record<string, ToolRowTone>> = {
  failed: "bad",
  empty: "warn",
};

const MERMAID_STATUS_ICONS: Readonly<Record<string, IconName>> = {
  failed: "error",
  empty: "warning",
};

export function isMermaidTool(name: string): boolean {
  return MERMAID_TOOL_NAMES.includes(name.toLowerCase());
}

/** The tool header: what was drawn, how big it came out, what it was pointed at. */
/**
 * What the picture was drawn with: the canvas it was laid out on, how many labels
 * it says, how big the markup came back, how long the draw took. They are the
 * call's own figures, so they ride its header; the body is the picture.
 */
export function mermaidChipsOf(
  item: ToolTranscriptItem,
): readonly ToolRowCell[] {
  const view = mermaidToolViewOf(
    item.name,
    item.args,
    item.details,
    item.status,
  );
  return view === null ? [] : view.cells;
}

export const mermaidToolPreviewOf = (item: ToolTranscriptItem): string =>
  toolPreviewLine(
    item,
    mermaidToolViewOf(item.name, item.args, item.details, item.status),
    MERMAID_WORDS,
    headOf,
  );

function headOf(_tool: string, view: MermaidToolView): string {
  const picture = view.picture;
  if (picture.status === "failed") {
    return `${diagramName(picture) === "" ? "diagram" : diagramName(picture)} · ${diagramFailureLine(picture)}`;
  }
  // The kind and the file the picture was saved to: the canvas, the markup size
  // and the label count are measured figures, so they are chips, and printing
  // them here as well put one copy in the header's clipping budget.
  return partsLine(diagramName(picture), view.written);
}

/**
 * The page a diagram is given: the window the log stands in, less the tool row's own
 * inset and the band's padding.
 *
 * A diagram used to be fitted into a fixed 640, so a wide window showed a diagram as
 * a small picture in the middle of the room it was drawn for. The row's width is the
 * measure instead, and the fixed number stays as the floor for the frame that has no
 * window to measure yet.
 */
function diagramPageOf(
  windowWidth: number | undefined,
  t: AdwaitaTheme,
): number {
  if (windowWidth === undefined) return DIAGRAM_BOX_WIDTH;
  return Math.max(
    DIAGRAM_BOX_WIDTH,
    windowWidth - PAGE_INSET * 2 - t.space.sm * 2,
  );
}

/**
 * How big the picture is drawn: as wide as the row it stands in, never enlarged
 * past a legible blow-up, and never taller than the band's own budget — a tall
 * sequence diagram is scrolled past, not drawn down the whole window.
 */
function boxOf(
  width: number,
  height: number,
  page: number,
): { w: number; h: number; scale: number } {
  if (width <= 0 || height <= 0) return { w: 0, h: 0, scale: 1 };
  const scale = Math.min(
    page / width,
    DIAGRAM_BOX_HEIGHT / height,
    DIAGRAM_UPSCALE,
  );
  return {
    w: Math.round(width * scale),
    h: Math.round(height * scale),
    scale,
  };
}

/** The parser stopped here: the line it stopped on, and its caret. */
function FailureSnippet({ snippet }: { snippet: string }): JSX.Element | null {
  const t = useAdwaita();
  if (snippet.trim() === "") return null;
  const lines = snippet.split("\n");
  // Bare: the row's answer already stands on the log's band, and the snippet is
  // part of that answer, not a plate laid over it.
  return (
    <code
      code={lines.join("\n")}
      theme={buildNativeTheme(t)}
      style={{
        fontFamily: t.type.fontFamilyMono,
        fontSize: t.type.caption,
        lineHeight: codeLineBox(t),
        color: t.color.text.primary,
        flexShrink: 0,
      }}
    />
  );
}

/** The corner mark a diagram's picture wears when the cursor is over it. */
const DIAGRAM_BADGE = 24;

export interface MermaidToolRowsProps {
  item: ToolTranscriptItem;
}

export function MermaidToolRows({ item }: MermaidToolRowsProps): JSX.Element {
  const t = useAdwaita();
  const win = useWindowSize();

  if (item.status === "running") {
    return (
      <ToolRunning
        text={
          RUNNING_TEXT[item.name.toLowerCase()] ??
          RUNNING_TEXT[MERMAID_RENDER_TOOL]
        }
      />
    );
  }

  const view = mermaidToolViewOf(
    item.name,
    item.args,
    item.details,
    item.status,
  );
  if (view === null) return <ToolUnknownResult item={item} tool={item.name} />;

  const { picture } = view;
  const box = boxOf(
    picture.width,
    picture.height,
    diagramPageOf(win?.width, t),
  );
  const markup = picture.svg === "" ? "" : paintDiagram(picture.svg, t);

  return (
    <div style={toolBodyStack(t)}>
      {markup === "" ? null : (
        <ZoomImage
          src={`data:image/svg+xml;utf8,${encodeURIComponent(markup)}`}
          title={
            view.written === ""
              ? `${diagramName(picture) || "diagram"} diagram`
              : view.written
          }
          detail={`${String(picture.width)}×${String(picture.height)} canvas — SVG, so it stays sharp at any size`}
          box={{
            width: box.w,
            height: box.h,
            maxWidth: "100%",
            flexShrink: 0,
          }}
          badge={DIAGRAM_BADGE}
        />
      )}

      {markup !== "" && box.scale < 1 ? (
        <ToolCaptionLine
          color={mutedText(t)}
          text={`shown at ${String(Math.round(box.scale * 100))}% — \`path\` saves the picture at full size`}
        />
      ) : null}

      {
        // The header already says which line the parser stopped on; the snippet is
        // what the header has no room for — the offending line itself, and the caret
        // under the column it stopped at. Not the sentence again.
        picture.status === "failed" ? (
          <FailureSnippet snippet={picture.failure?.snippet ?? ""} />
        ) : null
      }

      <ToolStatusNote
        status={view.status}
        note={
          picture.status === "ok" || picture.status === "failed"
            ? ""
            : picture.error
        }
        tones={MERMAID_STATUS_TONES}
        icons={MERMAID_STATUS_ICONS}
      />
    </div>
  );
}
