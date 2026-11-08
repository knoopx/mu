import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { OPENUI_CLEAR_TOOL, OPENUI_TOOL_LABELS } from "../constants";
import { programLine, unknownProgram } from "../lib/answer";
import { programStore } from "../lib/programStore";
import { programParam } from "../lib/params";
import { blocks, statusTable, toolResult } from "../../core/lib/agent/toolText";
import type { OpenuiClearDetails, OpenuiClearParams } from "../types";

const Parameters = Type.Object({
  name: programParam(
    "Program to remove — omit to remove every program in the log",
  ),
});

async function executeOpenuiClear(
  params: OpenuiClearParams,
): Promise<AgentToolResult<OpenuiClearDetails>> {
  const named = params.name?.trim() ?? "";
  const snapshot = programStore.getSnapshot();

  if (named !== "" && !programStore.hasProgram(named)) {
    return {
      content: [{ type: "text", text: unknownProgram(named, snapshot.order) }],
      details: {
        status: "unknown-program",
        cleared: named,
        active: snapshot.active,
        programs: snapshot.order,
      },
      isError: true,
    };
  }

  programStore.removeProgram(named === "" ? undefined : named);
  const after = programStore.getSnapshot();

  return toolResult(
    blocks(
      statusTable({
        cleared: named === "" ? "every program" : named,
        remaining: after.order.length,
      }),
      after.order.length === 0
        ? "no program is rendered yet — its programs, their state and their queued interactions are gone"
        : programLine(after.active, after.order),
    ),
    {
      status: after.order.length === 0 ? "empty" : "ok",
      cleared: named === "" ? "*" : named,
      active: after.active,
      programs: after.order,
    },
  );
}

export const openuiClearTool: ToolDefinition<
  typeof Parameters,
  OpenuiClearDetails
> = {
  name: OPENUI_CLEAR_TOOL,
  label: OPENUI_TOOL_LABELS[OPENUI_CLEAR_TOOL],
  description:
    "Remove one program from the log, or every program when `name` is omitted. Its source, " +
    "its bound state and its queued interactions go with it, and the log stops painting it. " +
    "The tool rows that rendered those programs stay in the conversation as the record of what " +
    "was built.",
  promptSnippet: "Remove one program, or every program, from the log",
  promptGuidelines: [
    "Clear a program before replacing a screen with a differently named one, so the log holds only the screens the human still needs.",
    "Clearing is not undoing: the conversation keeps every render that happened, and a re-render of the same name is the way to fix a program.",
  ],

  executionMode: "sequential",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeOpenuiClear(params);
  },
};
