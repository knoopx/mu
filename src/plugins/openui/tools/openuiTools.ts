import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { OPENUI_TOOLS_TOOL, OPENUI_TOOL_LABELS } from "../constants";
import { programStore } from "../lib/programStore";
import { blocks, statusTable, toolResult } from "../../core/lib/agent/toolText";
import type { OpenuiToolsDetails, OpenuiToolsParams } from "../types";

const Parameters = Type.Object({
  fixtures: Type.Record(Type.String(), Type.Unknown(), {
    description:
      "tool name -> the JSON a Query(name, args, default) call in the program should resolve to. An empty object clears them.",
  }),
});

async function executeOpenuiTools(
  params: OpenuiToolsParams,
): Promise<AgentToolResult<OpenuiToolsDetails>> {
  const fixtures = params.fixtures ?? {};
  programStore.setFixtures(fixtures);
  const names = Object.keys(fixtures);

  return toolResult(
    blocks(
      statusTable({ fixtures: names.length, status: "ok" }),
      names.length === 0
        ? "fixtures cleared — every Query() now falls back to its default value"
        : `Query() now resolves to: ${names.join(", ")} — the programs in the log re-draw with it`,
    ),
    { status: names.length === 0 ? "empty" : "ok", count: names.length, fixtures: names },
  );
}

export const openuiToolsTool: ToolDefinition<
  typeof Parameters,
  OpenuiToolsDetails
> = {
  name: OPENUI_TOOLS_TOOL,
  label: OPENUI_TOOL_LABELS[OPENUI_TOOLS_TOOL],
  description:
    "Replace the data served to a program's `Query(\"tool\", args, default)` calls. This app has " +
    "no backends of its own for a program to call: whatever JSON is put here is exactly what " +
    "the rendered screen shows, and the programs in the log re-draw as soon as it is set. " +
    "Pass an empty object to clear it.",
  promptSnippet: "Serve the data a program's Query() calls resolve to",
  promptGuidelines: [
    "Set openui-tools before the render that uses the data, keyed by the exact names the program passes to Query().",
    "A Query() whose name was never served fails as a missing tool — the screen shows the failure, so name the fixtures and the queries together.",
  ],

  executionMode: "sequential",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeOpenuiTools(params);
  },
};