/**
 * `openui-stream` — append one piece of a program and re-draw what has arrived.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type { PluginTool } from "../../core/lib/plugin/manifest";
import { DEFAULT_PROGRAM_NAME, OPENUI_STREAM_TOOL } from "../constants";
import type { OpenUIProgramDetails } from "../types";
import { chunkParam, namedParam } from "../lib/params";
import { programWriteAnswer } from "../lib/answer";
import { appendChunk } from "../lib/programStore/verbs";
import { STREAM_GUIDELINES } from "./guidelines";

const StreamParametersSchema = Type.Object({
  name: Type.Optional(namedParam),
  chunk: chunkParam,
  done: Type.Optional(
    Type.Boolean({
      description:
        "true closes the program and stops the live render mid-stream (default false).",
    }),
  ),
});

export const openUIStreamTool: PluginTool<
  typeof StreamParametersSchema,
  OpenUIProgramDetails
> = {
  name: OPENUI_STREAM_TOOL,
  icon: "stream",
  label: OPENUI_STREAM_TOOL,
  description:
    "Append one chunk of OpenUI Lang source to program `name`, re-parse the whole accumulated text and draw the partial result live in the log until `done: true` closes the program. " +
    "Send source in the order you generate it; a truncated program mid-stream is reported as `incomplete: true` and is expected. Chunks are appended in call order, so this tool never runs beside another program write.",
  promptSnippet: "Stream a program into the log piece by piece",
  promptGuidelines: [...STREAM_GUIDELINES],

  executionMode: "sequential",
  parameters: StreamParametersSchema,

  async execute(
    toolCallId,
    params,
  ): Promise<AgentToolResult<OpenUIProgramDetails>> {
    const name = params.name ?? DEFAULT_PROGRAM_NAME;
    const outcome = appendChunk(
      name,
      params.chunk,
      params.done === true,
      toolCallId,
    );
    const details = outcome.details;

    return programWriteAnswer(outcome, {
      refusal: `program ${name} could not take this chunk`,
      columns: {
        chunk: details.chunkChars,
        ...(details.streaming ? { open: "yes" } : {}),
      },
      // A program mid-stream is meant to be half-written, so its warnings are
      // the expected shape of the work and only a hard error is worth naming.
      errorsOnly: true,
    });
  },
};
