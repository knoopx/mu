/**
 * `openui-list` — every program the log holds.
 */

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { OPENUI_LIST_TOOL } from "../constants";
import type { OpenUIListDetails } from "../types";
import { blocks, counted, statusTable, toolResult } from "../../core/lib/agent/toolText";
import { programTable } from "../lib/format";
import { programStore } from "../lib/programStore/store";
import { LIST_GUIDELINES } from "./guidelines";

const ListParametersSchema = Type.Object({});

export const openUIListTool: ToolDefinition<
  typeof ListParametersSchema,
  OpenUIListDetails
> = {
  name: OPENUI_LIST_TOOL,
  label: OPENUI_LIST_TOOL,
  description:
    "List every program in the log with its size, whether it is still streaming, how many statements the renderer counted, how many errors and unread interactions it holds, and which one is showing. " +
    "Cheap: call it to rediscover program names before editing, switching or clearing.",
  promptSnippet: "List the programs in the log and which one is showing",
  promptGuidelines: [...LIST_GUIDELINES],

  executionMode: "parallel",
  parameters: ListParametersSchema,

  async execute(): Promise<AgentToolResult<OpenUIListDetails>> {
    const programs = programStore.list().map((record) => programStore.infoOf(record));
    const showing = programStore.liveName();
    const details: OpenUIListDetails = {
      status: programs.length === 0 ? "empty" : "ok",
      error: "",
      programs,
      count: programs.length,
      showing,
    };

    return toolResult(
      blocks(
        statusTable({
          programs: details.count,
          showing: showing === "" ? "(none)" : showing,
        }),
        programTable(programs),
        programs.length === 0
          ? "the log holds no program yet"
          : counted(programs.length, "program"),
      ),
      details,
    );
  },
};
