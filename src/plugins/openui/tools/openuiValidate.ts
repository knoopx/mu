import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { OPENUI_VALIDATE_TOOL, OPENUI_TOOL_LABELS } from "../constants";
import { analyze } from "../lib/analysis";
import {
  blocks,
  toolResult,
} from "../../core/lib/agent/toolText";
import {
  buildReport,
  programLine,
  componentLine,
  errorBlock,
  reportHead,
  warningBlock,
} from "../lib/answer";
import { programStore } from "../lib/programStore";
import { codeParam } from "../lib/params";
import type { OpenuiValidateDetails, OpenuiValidateParams } from "../types";

const Parameters = Type.Object({
  code: codeParam(),
});

async function executeOpenuiValidate(
  params: OpenuiValidateParams,
): Promise<AgentToolResult<OpenuiValidateDetails>> {
  const analysis = analyze(params.code);
  const report = buildReport("", analysis, programStore.getSnapshot(), {
    streaming: false,
    chars: params.code.length,
  });

  return toolResult(
    blocks(
      reportHead(report),
      errorBlock(report.errors),
      warningBlock(report.errors),
      componentLine(report.components),
      programLine(report.active, report.programs),
    ),
    report,
  );
}

export const openuiValidateTool: ToolDefinition<
  typeof Parameters,
  OpenuiValidateDetails
> = {
  name: OPENUI_VALIDATE_TOOL,
  label: OPENUI_TOOL_LABELS[OPENUI_VALIDATE_TOOL],
  description:
    "Parse OpenUI Lang source against this app's library and answer with the diagnostics — " +
    "statements, the components it would draw, unresolved names, and every error with the " +
    "move that clears it — without rendering anything. Use it to check a program, or to " +
    "re-check an edit, before committing it with openui-render.",
  promptSnippet: "Parse an OpenUI Lang program for diagnostics without rendering it",
  promptGuidelines: [
    "Validate before rendering when a program is new or was rewritten from a rejected one; the parse is the same one a render will run.",
    "Treat `unresolved` as a bug, not a note: an unresolved name renders as null, and a $ prefix is how a reference is written.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeOpenuiValidate(params);
  },
};
