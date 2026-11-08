import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { OPENUI_LIBRARY_TOOL, OPENUI_TOOL_LABELS } from "../constants";
import {
  componentEntry,
  componentIndex,
  componentNames,
  groupIndex,
  groupNotes,
  library,
  librarySchema,
} from "../components/library/registry";
import {
  blocks,
  statusTable,
  tableOf,
  toolResult,
} from "../../core/lib/agent/toolText";
import { readProps, schemaText } from "../lib/schema";
import { programParam } from "../lib/params";
import type { OpenuiLibraryDetails, OpenuiLibraryParams } from "../types";

const Parameters = Type.Object({
  name: programParam(
    "Component to read, e.g. \"Table\" — omit for the whole component index",
  ),
});

const EMPTY_DETAILS: OpenuiLibraryDetails = {
  status: "ok",
  name: "",
  description: "",
  group: "",
  root: "Stack",
  chars: 0,
  componentCount: 0,
  groupCount: 0,
  groups: {},
  components: [],
  schema: {},
  props: [],
  groupNotes: [],
};

const componentNamesLine = (): string =>
  `available: ${componentNames().join(", ")}`;

/** Every component, grouped the way the language reference teaches them. */
function indexAnswer(): AgentToolResult<OpenuiLibraryDetails> {
  const root = library.root ?? "Stack";
  const groups = groupIndex();
  const components = componentIndex();
  const body = blocks(
    statusTable({
      root,
      components: components.length,
      groups: Object.keys(groups).length,
      status: "ok",
    }),
    groupsOf(groups),
    `openui-library({ name: "Table" }) answers one component's exact schema; openui-prompt answers the whole language. Root component: ${root}.`,
  );

  return toolResult(body, {
    ...EMPTY_DETAILS,
    root,
    componentCount: components.length,
    groupCount: Object.keys(groups).length,
    groups,
    components,
    chars: body.length,
  });
}

/** One component: its props as rows, the rules of its group, and its schema. */
function componentAnswer(name: string): AgentToolResult<OpenuiLibraryDetails> {
  const root = library.root ?? "Stack";
  const definition = librarySchema().$defs?.[name];
  const entry = componentEntry(name);

  if (definition === undefined) {
    return {
      content:
        [{ type: "text", text: blocks(`no component "${name}" in this library`, componentNamesLine()) }],
      details: { ...EMPTY_DETAILS, status: "unknown-program", name, root },
      isError: true,
    };
  }

  const props = readProps(definition);
  const notes = entry === undefined ? [] : groupNotes(entry.group);
  const body = blocks(
    statusTable({
      component: name,
      group: entry?.group ?? "",
      props: `${String(props.filter((prop) => prop.required).length)} of ${String(
        props.length,
      )} required`,
      status: "ok",
    }),
    entry?.description === undefined ? "" : entry.description,
    tableOf(
      props.map((prop) => ({
        prop: prop.name,
        type: prop.type,
        required: prop.required ? "yes" : "",
        description: prop.description,
      })),
    ),
    notes.length === 0 ? "" : notes.join("\n"),
    schemaText(definition),
  );

  return toolResult(body, {
    ...EMPTY_DETAILS,
    name,
    description: entry?.description ?? "",
    group: entry?.group ?? "",
    root,
    chars: body.length,
    componentCount: props.length,
    schema: definition,
    props,
    groupNotes: notes,
  });
}

async function executeOpenuiLibrary(
  params: OpenuiLibraryParams,
): Promise<AgentToolResult<OpenuiLibraryDetails>> {
  const name = params.name?.trim() ?? "";
  return name === "" ? indexAnswer() : componentAnswer(name);
}

const groupsOf = (groups: Record<string, string[]>): string =>
  tableOf(
    Object.entries(groups).map(([group, names]) => ({
      group,
      components: String(names.length),
      names: names.join(", "),
    })),
  );

export const openuiLibraryTool: ToolDefinition<
  typeof Parameters,
  OpenuiLibraryDetails
> = {
  name: OPENUI_LIBRARY_TOOL,
  label: OPENUI_TOOL_LABELS[OPENUI_LIBRARY_TOOL],
  description:
    "Inspect the component library this app renders. Without `name`: the component index " +
    "(name, description, group), the root component and the counts. With `name`: that " +
    "component's JSON Schema, its props as one row each with the type it takes and whether " +
    "it is required, and the rules its group is taught by. Read this before and while " +
    "authoring — a guessed component name is a hard parse error.",
  promptSnippet:
    "Read the component index, or one component's exact props and JSON Schema",
  promptGuidelines: [
    "Ask openui-library for the index once, then for the specific components a program uses before writing them.",
    "Read a rejected call's component again with openui-library({ name }): the row that says which prop is missing is the fix.",
    "A component absent from the index cannot be drawn, however obvious its name looks.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeOpenuiLibrary(params);
  },
};