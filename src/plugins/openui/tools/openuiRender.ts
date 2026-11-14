/**
 * `openui-render` — put a program in the log and draw it now.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type { PluginTool } from "../../core/lib/plugin/manifest";
import { DEFAULT_PROGRAM_NAME, OPENUI_RENDER_TOOL } from "../constants";
import type { OpenUIProgramDetails } from "../types";
import { namedParam, codeParam } from "../lib/params";
import { programWriteAnswer } from "../lib/answer";
import { writeProgram } from "../lib/programStore/verbs";
import { RENDER_GUIDELINES } from "./guidelines";

/** The move a call answers with when the source it sent has a hard error. */
const PARSE_HINT =
  "the program renders as far as it parses — fix the first error the call printed and re-send the same name rather than starting a second program.";

const RenderParametersSchema = Type.Object({
  name: Type.Optional(namedParam),
  code: codeParam,
  done: Type.Optional(
    Type.Boolean({
      description:
        "true closes the program and stops the live render mid-stream (default true).",
    }),
  ),
  activate: Type.Optional(
    Type.Boolean({
      description:
        "Make this program the one the log paints live (default true).",
    }),
  ),
});

export const openUIRenderTool: PluginTool<
  typeof RenderParametersSchema,
  OpenUIProgramDetails
> = {
  name: OPENUI_RENDER_TOOL,
  icon: "dashboard",
  label: OPENUI_RENDER_TOOL,
  description:
    "Replace program `name` with this OpenUI Lang source and draw it in the conversation log immediately. " +
    "It parses first and answers with the diagnostics: `ok` is false when a hard error exists, the program still renders, " +
    "so the human sees the partial screen and the hint sits next to it. Keep `name` stable to edit a program in place. Use openui-stream instead when the source should arrive piece by piece.",
  promptSnippet: "Put a program in the log and render it now",
  promptGuidelines: [...RENDER_GUIDELINES],

  executionMode: "sequential",
  parameters: RenderParametersSchema,

  async execute(
    toolCallId,
    params,
  ): Promise<AgentToolResult<OpenUIProgramDetails>> {
    const name = params.name ?? DEFAULT_PROGRAM_NAME;
    const outcome = writeProgram(name, params.code, toolCallId, {
      streaming: params.done === false,
      activate: params.activate !== false,
    });

    return programWriteAnswer(outcome, {
      refusal: `program ${name} was not written`,
      columns: { ok: outcome.details.ok ? "yes" : "no" },
      hint: PARSE_HINT,
    });
  },
};
