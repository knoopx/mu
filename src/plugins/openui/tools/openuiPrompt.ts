/**
 * `openui-prompt` — the language reference for this app's library.
 *
 * The syntax rules are lang-core's; the component signatures come from the
 * library this app can actually draw; the screen rules are mu's. This is what a
 * model reads before it writes a program. The reference carries no worked
 * example of its own — a hand-written one is data, and data gets copied — so
 * only snippets the call passes in appear, and a call that passes none gets a
 * reference with nothing but the rules and the signatures to work from.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type { PluginTool } from "../../core/lib/plugin/manifest";
import { OPENUI_PROMPT_TOOL } from "../constants";
import type { OpenUIPromptDetails } from "../types";
import {
  blocks,
  counted,
  statusTable,
  toolResult,
} from "../../core/lib/agent/toolText";
import { buildLanguagePrompt } from "../lib/analysis/prompt";
import {
  componentCount,
  libraryGroups,
  rootComponent,
} from "../lib/schema/library";
import { PROMPT_GUIDELINES } from "./guidelines";

const PromptParametersSchema = Type.Object({
  preamble: Type.Optional(
    Type.String({
      maxLength: 2_000,
      description: "Extra instructions to place above the language reference.",
    }),
  ),
  tools: Type.Optional(
    Type.Array(Type.String({ maxLength: 64 }), {
      maxItems: 40,
      description:
        "Names of the tools your program will call through Query(name, args, default).",
    }),
  ),
  examples: Type.Optional(
    Type.Array(Type.String({ maxLength: 4_000 }), {
      maxItems: 8,
      description:
        "OpenUI Lang snippets to show in the reference — the only examples it carries.",
    }),
  ),
  editMode: Type.Optional(
    Type.Boolean({
      description: "Add the rules for patching a program already in the log.",
    }),
  ),
});

export const openUIPromptTool: PluginTool<
  typeof PromptParametersSchema,
  OpenUIPromptDetails
> = {
  name: OPENUI_PROMPT_TOOL,
  icon: "libraryBooks",
  label: OPENUI_PROMPT_TOOL,
  description:
    "Get the OpenUI Lang reference for THIS app's component library: the syntax rules, the signature of every component this app can actually render, and how a program wires Query() data and actions. " +
    "Call it once before writing a program — it is how you learn the language, and the component list it prints is the whole truth about what will draw. Returned as plain text.",
  promptSnippet:
    "Get the OpenUI Lang language reference for this app's library",
  promptGuidelines: [...PROMPT_GUIDELINES],

  executionMode: "parallel",
  parameters: PromptParametersSchema,

  async execute(
    _toolCallId,
    params,
  ): Promise<AgentToolResult<OpenUIPromptDetails>> {
    const tools = params.tools ?? [];
    const examples = params.examples ?? [];
    const preamble = params.preamble ?? "";
    const editMode = params.editMode === true;

    const text = buildLanguagePrompt({ preamble, tools, examples, editMode });

    const details: OpenUIPromptDetails = {
      status: "ok",
      error: "",
      chars: text.length,
      root: rootComponent,
      components: componentCount(),
      groups: libraryGroups().map((group) => group.name),
      tools,
      examples: examples.length,
      editMode,
    };

    return toolResult(
      blocks(
        statusTable({
          root: details.root,
          components: details.components,
          groups: details.groups.length,
          chars: details.chars,
          ...(tools.length === 0 ? {} : { tools: tools.length }),
          ...(editMode ? { editMode: "yes" } : {}),
        }),
        counted(details.components, "component") +
          " in " +
          counted(details.groups.length, "group"),
        text,
      ),
      details,
    );
  },
};
