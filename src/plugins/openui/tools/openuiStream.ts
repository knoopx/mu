import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { OPENUI_STREAM_TOOL, OPENUI_TOOL_LABELS } from "../constants";
import { analyze } from "../lib/analysis";
import {
  buildReport,
  programLine,
  componentLine,
  errorBlock,
  programName,
  reportHead,
  streamLine,
  streamState,
} from "../lib/answer";
import { programStore } from "../lib/programStore";
import { chunkParam, doneParam, programParam } from "../lib/params";
import { blocks, toolResult } from "../../core/lib/agent/toolText";
import type { OpenuiStreamDetails, OpenuiStreamParams } from "../types";

const Parameters = Type.Object({
  name: programParam("Program to append to"),
  chunk: chunkParam(),
  done: doneParam(true),
});

/**
 * A stream is one program arriving in pieces. Every call re-parses the whole
 * accumulated source, so the human watches the screen take shape and a
 * half-written statement is a normal mid-stream state, not a failure.
 */
async function executeOpenuiStream(
  toolCallId: string,
  params: OpenuiStreamParams,
): Promise<AgentToolResult<OpenuiStreamDetails>> {
  const name = programName(params.name);
  const done = params.done === true;

  const program = programStore.appendChunk(name, params.chunk, done, toolCallId);
  const analysis = analyze(program.lang);
  const report = buildReport(name, analysis, programStore.getSnapshot(), {
    streaming: program.streaming,
    chars: program.lang.length,
  });

  return toolResult(
    blocks(
      reportHead(report),
      streamLine(params.chunk.length, program.lang.length),
      errorBlock(report.errors),
      componentLine(report.components),
      streamState(program.streaming, report.incomplete),
      programLine(report.active, report.programs),
    ),
    { ...report, receivedChars: params.chunk.length },
  );
}

export const openuiStreamTool: ToolDefinition<
  typeof Parameters,
  OpenuiStreamDetails
> = {
  name: OPENUI_STREAM_TOOL,
  label: OPENUI_TOOL_LABELS[OPENUI_STREAM_TOOL],
  description:
    "Append one chunk of OpenUI Lang source to program `name`, re-parse the whole accumulated " +
    "text and draw the partial result live in the log until `done: true` closes the program. " +
    "Send source in the order you generate it; a truncated program mid-stream is reported as " +
    "`incomplete: true` and is expected. Chunks are appended in call order, so this tool never " +
    "runs beside another program write.",
  promptSnippet: "Stream a program into the log piece by piece",
  promptGuidelines: [
    "Stream a long program with openui-stream so the human watches it appear, and close it with done: true — an open program keeps its form interactions disabled.",
    "Do not re-send a chunk that was already accepted: the source accumulates, it does not replace.",
  ],

  executionMode: "sequential",
  parameters: Parameters,

  async execute(toolCallId, params) {
    return executeOpenuiStream(toolCallId, params);
  },
};
