import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { OPENUI_STATE_TOOL, OPENUI_TOOL_LABELS } from "../constants";
import {
  NO_PROGRAM,
  unknownProgram,
} from "../lib/answer";
import { programStore, emptyRuntime, type OpenuiProgram } from "../lib/programStore";
import { readProgramParam } from "../lib/params";
import {
  blocks,
  counted,
  statusTable,
  tableOf,
  toolResult,
} from "../../core/lib/agent/toolText";
import type {
  OpenuiRuntimeSummary,
  OpenuiStateDetails,
  OpenuiStateParams,
} from "../types";

const Parameters = Type.Object({
  name: readProgramParam(),
});

const summaryOf = (
  runtime: ReturnType<typeof emptyRuntime>,
  streaming: boolean,
): OpenuiRuntimeSummary => ({
  statements: runtime.statements,
  components: runtime.components,
  unresolved: runtime.unresolved,
  queryErrors: runtime.queryErrors,
  incomplete: runtime.incomplete,
  streaming,
  unread: runtime.unread,
  errors: runtime.errors,
});

const stateTableOf = (state: Record<string, unknown>): string => {
  const entries = Object.entries(state);
  if (entries.length === 0) return "";
  return tableOf(
    entries.map(([name, value]) => ({
      name: name.startsWith("$") ? name : `$${name}`,
      value: typeof value === "string" ? value : JSON.stringify(value) ?? String(value),
    })),
  );
};

/** What a read answers when there is no program to read. */
function nothingRendered(): AgentToolResult<OpenuiStateDetails> {
  return {
    content: [{ type: "text", text: NO_PROGRAM }],
    details: {
      status: "no-program",
      program: "",
      lang: "",
      chars: 0,
      updatedAt: 0,
      state: {},
      runtime: summaryOf(emptyRuntime(), false),
    },
  };
}

/** A name the log does not hold, answered with the names it does. */
function notRendered(
  name: string,
  names: readonly string[],
): AgentToolResult<OpenuiStateDetails> {
  return {
    content: [{ type: "text", text: unknownProgram(name, names) }],
    details: {
      status: "unknown-program",
      program: name,
      lang: "",
      chars: 0,
      updatedAt: 0,
      state: {},
      runtime: summaryOf(emptyRuntime(), false),
    },
    isError: true,
  };
}

/** The source, the `$state`, and everything the renderer published about it. */
function readState(
  name: string,
  program: OpenuiProgram,
  runtime: ReturnType<typeof emptyRuntime>,
): AgentToolResult<OpenuiStateDetails> {
  const summary = summaryOf(runtime, program.streaming);

  return toolResult(
    blocks(
      statusTable({
        program: name,
        chars: program.lang.length,
        statements: summary.statements,
        components: summary.components.length,
        errors: summary.errors.length,
        "unread events": summary.unread,
        streaming: program.streaming ? "yes" : "no",
      }),
      stateTableOf(runtime.state),
      summary.queryErrors.length === 0
        ? ""
        : `query failures:\n${summary.queryErrors.join("\n")}`,
      summary.unresolved.length === 0
        ? ""
        : `unresolved names: ${summary.unresolved.join(", ")}`,
      summary.errors.length === 0
        ? ""
        : tableOf(
            summary.errors.map((error) => ({
              code: error.code,
              message: error.message,
              hint: error.hint ?? "",
            })),
          ),
      counted(summary.components.length, "component") +
        (summary.incomplete ? " — the source is mid-statement" : ""),
      program.lang,
    ),
    {
      status: summary.errors.length === 0 ? "ok" : "invalid",
      program: name,
      lang: program.lang,
      chars: program.lang.length,
      updatedAt: program.updatedAt,
      state: runtime.state,
      runtime: summary,
    },
  );
}

async function executeOpenuiState(
  params: OpenuiStateParams,
): Promise<AgentToolResult<OpenuiStateDetails>> {
  const snapshot = programStore.getSnapshot();
  const name = params.name ?? snapshot.active;

  if (name === null || name === undefined) return nothingRendered();

  const program = snapshot.programs[name];
  if (program === undefined) return notRendered(name, snapshot.order);

  return readState(name, program, snapshot.runtime[name] ?? emptyRuntime());
}

export const openuiStateTool: ToolDefinition<
  typeof Parameters,
  OpenuiStateDetails
> = {
  name: OPENUI_STATE_TOOL,
  label: OPENUI_TOOL_LABELS[OPENUI_STATE_TOOL],
  description:
    "Read a program's source plus what the renderer published for it: the render errors, the " +
    "`$variable` values as the human left them, the components that were actually drawn, the " +
    "names that never resolved, how many interactions are waiting, and the query failures. " +
    "`name` defaults to the program the log is painting. This is how you see how a program " +
    "turned out — the parse only says the source was valid.",
  promptSnippet: "Read a program's source and what the renderer published about it",
  promptGuidelines: [
    "Read openui-state after a render: the components it lists are what the human sees, and its errors are the ones only drawing revealed.",
    "The `$variable` values are the human's current selections — build the next version of the program from them rather than from what you first set.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeOpenuiState(params);
  },
};
