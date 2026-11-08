import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { OPENUI_PROMPT_TOOL, OPENUI_TOOL_LABELS } from "../constants";
import {
  componentNames,
  groupIndex,
  library,
  systemPrompt,
} from "../components/library/registry";
import type { OpenuiPromptDetails, OpenuiPromptParams } from "../types";

const Parameters = Type.Object({
  preamble: Type.Optional(
    Type.String({
      description: "Extra instructions to place above the language reference.",
    }),
  ),
  tools: Type.Optional(
    Type.Array(Type.String(), {
      description:
        "Names of the tools your program will call through Query(name, args, default).",
    }),
  ),
  examples: Type.Optional(
    Type.Array(Type.String(), {
      description: "OpenUI Lang snippets to show in the reference.",
    }),
  ),
  editMode: Type.Optional(
    Type.Boolean({
      description: "Add the rules for patching a program already in the log.",
    }),
  ),
});

async function executeOpenuiPrompt(
  params: OpenuiPromptParams,
): Promise<AgentToolResult<OpenuiPromptDetails>> {
  const body = systemPrompt({
    ...(params.preamble === undefined ? {} : { preamble: params.preamble }),
    ...(params.tools === undefined ? {} : { tools: params.tools }),
    ...(params.examples === undefined ? {} : { examples: params.examples }),
    ...(params.editMode === undefined ? {} : { editMode: params.editMode }),
  });

  const groups = Object.keys(groupIndex());

  return {
    content: [{ type: "text", text: body }],
    details: {
      status: "ok",
      chars: body.length,
      lines: body.split("\n").length,
      components: componentNames().length,
      root: library.root ?? "Stack",
      groups,
      editMode: params.editMode === true,
      toolNames: params.tools ?? [],
    },
  };
}

export const openuiPromptTool: ToolDefinition<
  typeof Parameters,
  OpenuiPromptDetails
> = {
  name: OPENUI_PROMPT_TOOL,
  label: OPENUI_TOOL_LABELS[OPENUI_PROMPT_TOOL],
  description:
    "Get the OpenUI Lang reference for THIS app's component library: the syntax rules, the " +
    "signature of every component this app can actually render, and how a program wires " +
    "Query() data and actions. Call it once before writing a program — it is how you learn " +
    "the language, and the component list it prints is the whole truth about what will draw. " +
    "Returned as plain text.",
  promptSnippet:
    "Get the OpenUI Lang language reference for this app's component library",
  promptGuidelines: [
    "Call openui-prompt once before authoring an OpenUI Lang program, then follow it — the components it names are the only ones this app can draw.",
    "Never guess a component name or its argument order: a wrong one is a hard parse error, and openui-library({ name }) answers the exact schema.",
    "A program is a GNOME screen, not a web page: a header bar, one operated list, an inert status line — no card grids, no KPI strip with nothing to operate.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeOpenuiPrompt(params);
  },
};