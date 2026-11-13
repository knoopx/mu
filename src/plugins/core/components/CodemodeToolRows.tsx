/**
 * The codemode row: the calls a script made, what it printed, and how long it
 * took.
 *
 * A script's output is text it printed, not prose it wrote, so it goes to the
 * log's output box rather than to the markdown renderer the prose tools use —
 * the separators and `<console_output>` block pi puts in that answer are only
 * readable line by line. The nested calls are rows because a script's calls
 * never reach the model as tool calls: the transcript keeps them on this one
 * item.
 */

import { OutputBox, useAdwaita, type BadgeVariant } from "adwaita-gpuix";
import type { JSX } from "react";

import type { ToolTranscriptItem } from "../lib/agent/transcriptState";
import { ToolCaptionLine } from "./ToolCaptionLine";
import { ToolRowList, ToolStateNote, ToolSummary } from "./ToolDataRows";
import { codemodeAnswerOf, codemodeTookOf } from "../lib/codemode/answer";
import { codemodeViewOf } from "../lib/codemode/toolView";
import { CODEMODE_TOOL } from "../lib/codemode/script";
import { mutedText } from "../lib/ui/theme";
import { MAX_OUTPUT_LINES, plainOutputOf } from "../lib/ui/toolOutputMode";
import { toolBodyStack } from "../lib/ui/toolRowPaint";

export function isCodemodeTool(name: string): boolean {
  return name.toLowerCase() === CODEMODE_TOOL;
}

/** A call that finished is not news; one that is still running, or failed, is. */
const CALL_BADGE_VARIANTS: Readonly<Record<string, BadgeVariant>> = {
  running: "secondary",
  cancelled: "secondary",
  error: "destructive",
};

export interface CodemodeToolRowsProps {
  item: ToolTranscriptItem;
}

export function CodemodeToolRows({ item }: CodemodeToolRowsProps): JSX.Element {
  const t = useAdwaita();
  const answer = codemodeAnswerOf(item.output);
  const view = codemodeViewOf(item);
  const took = codemodeTookOf(answer.tookMs);
  /** A script answers with its point first, so the budget keeps the head of it. */
  const body = plainOutputOf(answer.body, MAX_OUTPUT_LINES, "head");

  return (
    <div style={toolBodyStack(t)}>
      {view.rows.length === 0 ? null : (
        <>
          <ToolSummary text={view.summary} />
          <ToolRowList
            rows={view.rows}
            variants={CALL_BADGE_VARIANTS}
            pressable={false}
          />
          {view.cost === "" ? null : (
            <ToolCaptionLine text={view.cost} color={mutedText(t)} />
          )}
        </>
      )}
      {body === "" ? null : (
        <OutputBox
          text={body}
          tone={item.status === "error" ? "error" : "default"}
        />
      )}
      {view.fullOutputPath === "" ? null : (
        <ToolStateNote
          icon="unfoldMore"
          text={`Full output: ${view.fullOutputPath}`}
        />
      )}
      {took === "" ? null : (
        <ToolCaptionLine text={took} color={mutedText(t)} />
      )}
    </div>
  );
}
