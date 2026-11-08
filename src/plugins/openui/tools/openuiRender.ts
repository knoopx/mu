import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { OPENUI_RENDER_TOOL, OPENUI_TOOL_LABELS } from "../constants";
import { analyze } from "../lib/analysis";
import {
  buildReport,
  programLine,
  componentLine,
  errorBlock,
  programName,
  reportHead,
  streamState,
} from "../lib/answer";
import { programStore } from "../lib/programStore";
import {
  activateParam,
  codeParam,
  doneParam,
  programParam,
} from "../lib/params";
import { blocks, toolResult } from "../../core/lib/agent/toolText";
import type { OpenuiRenderDetails, OpenuiRenderParams } from "../types";

const Parameters = Type.Object({
  name: programParam("Program to create or replace"),
  code: codeParam(),
  done: doneParam(false),
  activate: activateParam(),
});

/**
 * A render is a parse and a paint. The parse is answered here, the paint is
 * what the row below the call draws, and what the renderer saw is read back
 * with openui-state — so a hard error still reaches the human's screen, with
 * the hint next to it.
 */
async function executeOpenuiRender(
  toolCallId: string,
  params: OpenuiRenderParams,
): Promise<AgentToolResult<OpenuiRenderDetails>> {
  const name = programName(params.name);
  const analysis = analyze(params.code);
  const streaming = params.done === false;

  programStore.upsert(name, {
    lang: params.code,
    streaming,
    activate: params.activate !== false,
    owner: toolCallId,
  });

  const report = buildReport(name, analysis, programStore.getSnapshot(), {
    streaming,
    chars: params.code.length,
  });

  return toolResult(
    blocks(
      reportHead(report),
      errorBlock(report.errors),
      componentLine(report.components),
      streamState(streaming, report.incomplete),
      programLine(report.active, report.programs),
      report.ok
        ? ""
        : "the program is in the log with these errors — keep the same name and re-send corrected source",
    ),
    { ...report, receivedChars: params.code.length },
  );
}

export const openuiRenderTool: ToolDefinition<
  typeof Parameters,
  OpenuiRenderDetails
> = {
  name: OPENUI_RENDER_TOOL,
  label: OPENUI_TOOL_LABELS[OPENUI_RENDER_TOOL],
  description:
    "Replace program `name` with this OpenUI Lang source and draw it in the conversation log " +
    "immediately. It parses first and answers with the diagnostics: `ok` is false when a hard " +
    "error exists, the program still renders, so the human sees the partial screen and " +
    "the hint sits next to it. Keep `name` stable to edit a program in place. Use openui-stream " +
    "instead when the source should arrive piece by piece.",
  promptSnippet: "Put a program in the log and render it now",
  promptGuidelines: [
    "Render with openui-render, then read openui-state: the parse said the source is valid, the renderer says what it actually drew.",
    "Keep one name per screen and re-send it to edit in place — a new name every turn leaves a trail of programs the human has to ignore.",
    "A hard parse error still renders: fix the first error the call printed and re-send the same name rather than starting a second program.",
    "Feed a program its data with openui-tools first — Query(name, args, default) has no backend here but the JSON you supply.",
  ],

  executionMode: "sequential",
  parameters: Parameters,

  async execute(toolCallId, params) {
    return executeOpenuiRender(toolCallId, params);
  },
};
