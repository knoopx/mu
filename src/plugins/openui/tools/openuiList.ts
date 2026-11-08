import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { OPENUI_LIST_TOOL, OPENUI_TOOL_LABELS } from "../constants";
import { programLine } from "../lib/answer";
import { programStore, emptyRuntime } from "../lib/programStore";
import { blocks, counted, statusTable, tableOf, toolResult } from "../../core/lib/agent/toolText";
import type { OpenuiListDetails, OpenuiListParams, OpenuiProgramRow } from "../types";

const Parameters = Type.Object({});

async function executeOpenuiList(
  _params: OpenuiListParams,
): Promise<AgentToolResult<OpenuiListDetails>> {
  const snapshot = programStore.getSnapshot();
  const programs: OpenuiProgramRow[] = snapshot.order.map((name) => {
    const program = snapshot.programs[name];
    const runtime = snapshot.runtime[name] ?? emptyRuntime();
    return {
      name,
      chars: program?.lang.length ?? 0,
      streaming: program?.streaming ?? false,
      statements: runtime.statements,
      errors: runtime.errors.length,
      unread: runtime.unread,
      updatedAt: program?.updatedAt ?? 0,
    };
  });

  return toolResult(
    blocks(
      statusTable({
        showing: snapshot.active ?? "nothing",
        programs: programs.length,
        fixtures: programStore.fixtureNames().length,
      }),
      programs.length === 0
        ? "no program is rendered yet"
        : tableOf(
            programs.map((row) => ({
              program: row.name,
              chars: row.chars,
              statements: row.statements,
              errors: row.errors,
              "unread events": row.unread,
              streaming: row.streaming ? "yes" : "",
            })),
          ),
      counted(programs.length, "program"),
      programLine(snapshot.active, snapshot.order),
    ),
    {
      status: programs.length === 0 ? "empty" : "ok",
      active: snapshot.active,
      count: programs.length,
      programs,
      fixtures: programStore.fixtureNames(),
    },
  );
}

export const openuiListTool: ToolDefinition<
  typeof Parameters,
  OpenuiListDetails
> = {
  name: OPENUI_LIST_TOOL,
  label: OPENUI_TOOL_LABELS[OPENUI_LIST_TOOL],
  description:
    "List every program in the log with its size, whether it is still streaming, how many " +
    "statements the renderer counted, how many errors and unread interactions it holds, and " +
    "which one is showing. Cheap: call it to rediscover program names before editing, " +
    "switching or clearing.",
  promptSnippet: "List the programs in the log and which one is showing",
  promptGuidelines: [
    "Call openui-list before naming a program you did not render in this turn — one screen keeps one name.",
    "A program with unread events is waiting on you: drain openui-events before rendering over it.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeOpenuiList(params);
  },
};
