import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { OPENUI_SWITCH_TOOL, OPENUI_TOOL_LABELS } from "../constants";
import { programLine, unknownProgram } from "../lib/answer";
import { programStore } from "../lib/programStore";
import { namedProgramParam } from "../lib/params";
import { blocks, statusTable, toolResult } from "../../core/lib/agent/toolText";
import type { OpenuiSwitchDetails, OpenuiSwitchParams } from "../types";

const Parameters = Type.Object({
  name: namedProgramParam("Program to make the live one in the log"),
});

async function executeOpenuiSwitch(
  params: OpenuiSwitchParams,
): Promise<AgentToolResult<OpenuiSwitchDetails>> {
  const name = params.name.trim();
  const snapshot = programStore.getSnapshot();

  if (!programStore.hasProgram(name)) {
    return {
      content: [{ type: "text", text: unknownProgram(name, snapshot.order) }],
      details: {
        status: "unknown-program",
        active: snapshot.active ?? "",
        programs: snapshot.order,
      },
      isError: true,
    };
  }

  programStore.setActive(name);
  const after = programStore.getSnapshot();

  return toolResult(
    blocks(
      statusTable({ showing: name, programs: after.order.length }),
      programLine(after.active, after.order),
    ),
    { status: "ok", active: name, programs: after.order },
  );
}

export const openuiSwitchTool: ToolDefinition<
  typeof Parameters,
  OpenuiSwitchDetails
> = {
  name: OPENUI_SWITCH_TOOL,
  label: OPENUI_TOOL_LABELS[OPENUI_SWITCH_TOOL],
  description:
    "Make an existing program the one the log paints " +
    "live and the one `openui-state` and `openui-events` read by default. An unknown name " +
    "fails with the program list rather than guessing.",
  promptSnippet: "Make an existing program the live one in the log",
  promptGuidelines: [
    "Switch to a program before reading its state or events when several are in the log, so the read is unambiguous.",
    "Switching shows a program; only openui-render or openui-stream changes what it says.",
  ],

  executionMode: "sequential",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeOpenuiSwitch(params);
  },
};
