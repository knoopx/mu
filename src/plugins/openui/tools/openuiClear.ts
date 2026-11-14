/**
 * `openui-clear` — take a program, or every program, out of the log.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type { PluginTool } from "../../core/lib/plugin/manifest";
import { MAX_PROGRAM_NAME, OPENUI_CLEAR_TOOL } from "../constants";
import type { OpenUIClearDetails } from "../types";
import { blocks, statusTable, toolResult } from "../../core/lib/agent/toolText";
import { programStore } from "../lib/programStore/store";
import { dropPrograms } from "../lib/programStore/verbs";
import { CLEAR_GUIDELINES } from "./guidelines";

const ClearParametersSchema = Type.Object({
  name: Type.Optional(
    Type.String({
      maxLength: MAX_PROGRAM_NAME,
      description:
        'Program to remove — omit to remove every program in the log (default "screen").',
    }),
  ),
});

export const openUIClearTool: PluginTool<
  typeof ClearParametersSchema,
  OpenUIClearDetails
> = {
  name: OPENUI_CLEAR_TOOL,
  icon: "deleteSweep",
  label: OPENUI_CLEAR_TOOL,
  description:
    "Remove one program from the log, or every program when `name` is omitted. Its source, its bound state and its queued interactions go with it, and the log stops painting it. " +
    "The tool rows that rendered those programs stay in the conversation as the record of what was built.",
  promptSnippet: "Remove one program, or every program, from the log",
  promptGuidelines: [...CLEAR_GUIDELINES],

  executionMode: "sequential",
  parameters: ClearParametersSchema,

  async execute(
    _toolCallId,
    params,
  ): Promise<AgentToolResult<OpenUIClearDetails>> {
    const name = params.name ?? "";
    const names =
      name === ""
        ? programStore.clearAll()
        : programStore.remove(name)
          ? [name]
          : [];
    dropPrograms(names);

    const details: OpenUIClearDetails = {
      status: names.length === 0 ? "unknown" : "ok",
      error:
        names.length === 0 ? `no program named "${name}" is in the log` : "",
      names,
      removed: names.length,
      remaining: programStore.list().map((record) => record.name),
    };

    return toolResult(
      blocks(
        statusTable({
          removed: details.removed,
          remaining: details.remaining.length,
        }),
        names.length === 0
          ? details.error
          : `out of the log: ${names.join(", ")}`,
        details.remaining.length === 0
          ? ""
          : `still in the log: ${details.remaining.join(", ")}`,
      ),
      details,
    );
  },
};
