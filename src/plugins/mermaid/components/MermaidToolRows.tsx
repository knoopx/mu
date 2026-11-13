/**
 * Draws a diagram call in the transcript: the picture itself, what it measures,
 * and — when the parser refused the source — the line it stopped on.
 *
 * The chips, the notes and the running block are core's. This file owns two
 * things: the words a diagram answer has that no other answer has, and the box
 * a picture is scaled into. That box is a *size* only: a picture gets no fill of
 * its own, so its ink sits on the log like every other row's text does. The
 * markup is painted in the colours the app is wearing right now, which is why
 * the picture is drawn here and not in the tool.
 */

import type { JSX } from "react";
import { useAdwaita, type IconName } from "adwaita-gpuix";

import { partsLine } from "../../core/lib/agent/toolText";
import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import { ToolCaptionLine } from "../../core/components/ToolCaptionLine";
import {
  ToolChips,
  ToolRunning,
  ToolStatusNote,
  ToolSummary,
  ToolUnknownResult,
} from "../../core/components/ToolDataRows";
import {
  toolPreviewLine,
  type ToolPreviewVocabulary,
} from "../../core/lib/agent/toolPreview";
import {
  toolBodyStack,
  toolStatusTone,
  type ToolRowTone,
} from "../../core/lib/ui/toolRowPaint";
import { buildNativeTheme, mutedText } from "../../core/lib/ui/theme";
import { outputPanel } from "../../core/lib/ui/transcriptLayout";
import { codeLineBox } from "../../core/lib/ui/tokens";
import {
  DIAGRAM_BOX_HEIGHT,
  DIAGRAM_BOX_WIDTH,
  DIAGRAM_FONT_SIZE,
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
  empty: "info",
};

export function isMermaidTool(name: string): boolean {
  return MERMAID_TOOL_NAMES.includes(name.toLowerCase());
}

/** The tool header: what was drawn, how big it came out, what it was pointed at. */
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

/** How big the picture is drawn: never bigger than the log, never smaller than
 *  it was laid out to be by more than it has to be. */
function boxOf(
  width: number,
  height: number,
): { w: number; h: number; scale: number } {
  if (width <= 0 || height <= 0) return { w: 0, h: 0, scale: 1 };
  const scale = Math.min(
    DIAGRAM_BOX_WIDTH / width,
    DIAGRAM_BOX_HEIGHT / height,
    1.5,
  );
  const fitted = scale < 1 ? scale : Math.max(scale, 1);
  return {
    w: Math.round(width * fitted),
    h: Math.round(height * fitted),
    scale: fitted,
  };
}

/** The parser stopped here: the line it stopped on, and its caret. */
function FailureSnippet({ snippet }: { snippet: string }): JSX.Element | null {
  const t = useAdwaita();
  if (snippet.trim() === "") return null;
  const lines = snippet.split("\n");
  return (
    <div style={outputPanel(t)}>
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
    </div>
  );
}

export interface MermaidToolRowsProps {
  item: ToolTranscriptItem;
}

export function MermaidToolRows({ item }: MermaidToolRowsProps): JSX.Element {
  const t = useAdwaita();

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
  const tone = toolStatusTone(view.status, MERMAID_STATUS_TONES);
  const box = boxOf(picture.width, picture.height);
  const markup = picture.svg === "" ? "" : paintDiagram(picture.svg, t);

  return (
    <div style={toolBodyStack(t)}>
      <ToolChips cells={view.cells} />

      {markup === "" ? null : (
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(markup)}`}
          alt={`${diagramName(picture) || "diagram"} diagram`}
          objectFit="contain"
          style={{
            width: box.w,
            height: box.h,
            maxWidth: "100%",
            flexShrink: 0,
          }}
        />
      )}

      {markup !== "" && box.scale < 1 ? (
        <ToolCaptionLine
          color={mutedText(t)}
          text={`shown at ${String(Math.round(box.scale * 100))}% of its ${String(picture.width)}×${String(picture.height)} canvas — \`path\` saves the picture at full size`}
        />
      ) : null}

      {view.written === "" ? null : (
        <ToolSummary text={`wrote ${view.written}`} tone="ok" />
      )}

      {picture.status === "failed" ? (
        <>
          <ToolSummary text={diagramFailureLine(picture)} tone={tone} />
          <FailureSnippet snippet={picture.failure?.snippet ?? ""} />
        </>
      ) : null}

      <ToolStatusNote
        status={view.status}
        note={picture.status === "ok" ? "" : picture.error}
        tones={MERMAID_STATUS_TONES}
        icons={MERMAID_STATUS_ICONS}
      />
    </div>
  );
}
