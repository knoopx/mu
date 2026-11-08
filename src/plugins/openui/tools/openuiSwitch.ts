/**
 * `openui-switch` — which program the log paints live.
 */

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { OPENUI_SWITCH_TOOL } from "../constants";
import type { OpenUISwitchDetails } from "../types";
import { blocks, statusTable, toolResult } from "../../core/lib/agent/toolText";
import { namedParam } from "../lib/params";
import { programTable } from "../lib/format";
import { programStore } from "../lib/programStore/store";
import { SWITCH_GUIDELINES } from "./guidelines";

const SwitchParametersSchema = Type.Object({
  name: Type.Optional(namedParam),
});

export const openUISwitchTool: ToolDefinition<
  typeof SwitchParametersSchema,
  OpenUISwitchDetails
> = {
  name: OPENUI_SWITCH_TOOL,
  label: OPENUI_SWITCH_TOOL,
  description:
    "Make an existing program the one the log paints live and the one `openui-state` and `openui-events` read by default. An unknown name fails with the program list rather than guessing.",
  promptSnippet: "Make an existing program the live one in the log",
  promptGuidelines: [...SWITCH_GUIDELINES],

  executionMode: "sequential",
  parameters: SwitchParametersSchema,

  async execute(_toolCallId, params): Promise<AgentToolResult<OpenUISwitchDetails>> {
    const name = params.name ?? "";
    const before = programStore.list().map((record) => programStore.infoOf(record));

    if (name === "" || !programStore.setLive(name)) {
      const details: OpenUISwitchDetails = {
        status: before.length === 0 ? "empty" : "unknown",
        error:
          name === ""
            ? "name the program to show — openui-list answers the names"
            : `no program named "${name}" is in the log`,
        name,
        showing: programStore.liveName(),
        programs: before,
      };
      return toolResult(
        blocks("the log holds no program by that name", details.error, programTable(before)),
        details,
      );
    }

    const details: OpenUISwitchDetails = {
      status: "ok",
      error: "",
      name,
      showing: programStore.liveName(),
      programs: programStore.list().map((record) => programStore.infoOf(record)),
    };

    return toolResult(
      blocks(
        statusTable({ showing: details.showing, switched: name }),
        programTable(details.programs),
      ),
      details,
    );
  },
};
