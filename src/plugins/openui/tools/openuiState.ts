/**
 * `openui-state` — what the renderer published for a program: its source, the
 * components it actually drew, the values the human left, and what is waiting.
 */

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { MAX_COMPONENT_ROWS, OPENUI_STATE_TOOL } from "../constants";
import type { OpenUIStateDetails } from "../types";
import {
  blocks,
  counted,
  moreLine,
  statusTable,
  toolResult,
} from "../../core/lib/agent/toolText";
import { nameParam } from "../lib/params";
import {
  diagnosticTable,
  queryLines,
  stateSource,
  valueTable,
} from "../lib/format";
import { programStore } from "../lib/programStore/store";
import { programWord, unknownProgram } from "../lib/answer";
import { STATE_GUIDELINES } from "./guidelines";

const StateParametersSchema = Type.Object({
  name: Type.Optional(
    Type.String({
      maxLength: 48,
      description:
        "Program to read; defaults to the program the log is painting.",
    }),
  ),
});

export const openUIStateTool: ToolDefinition<
  typeof StateParametersSchema,
  OpenUIStateDetails
> = {
  name: OPENUI_STATE_TOOL,
  label: OPENUI_STATE_TOOL,
  description:
    "Read a program's source plus what the renderer published for it: the render errors, the `$variable` values as the human left them, the components that were actually drawn, the names that never resolved, how many interactions are waiting, and the query failures. `name` defaults to the program the log is painting.",
  promptSnippet:
    "Read a program's source and what the renderer published about it",
  promptGuidelines: [...STATE_GUIDELINES],

  executionMode: "parallel",
  parameters: StateParametersSchema,

  async execute(
    _toolCallId,
    params,
  ): Promise<AgentToolResult<OpenUIStateDetails>> {
    const record = programStore.resolve(params.name);

    if (record === undefined) {
      const name = params.name ?? "";
      const details: OpenUIStateDetails = {
        status: name === "" ? "empty" : "unknown",
        error: unknownProgram(name),
        name,
        source: "",
        truncated: false,
        streaming: false,
        live: false,
        drawn: [],
        unresolved: [],
        errors: [],
        values: [],
        waiting: 0,
        queries: [],
        failures: [],
        statements: 0,
      };
      return toolResult(
        blocks("the log holds no program to read", details.error),
        details,
      );
    }

    const source = stateSource(record.source);
    const values = programStore.valuesOf(record);
    const drawn = record.publication.drawn.slice(0, MAX_COMPONENT_ROWS);
    const omitted = record.publication.drawn.length - drawn.length;

    const details: OpenUIStateDetails = {
      status: "ok",
      error: "",
      name: record.name,
      source: source.text,
      truncated: source.truncated,
      streaming: record.streaming,
      live: record.live,
      drawn,
      unresolved: record.parse.unresolved,
      errors: [...record.parse.diagnostics, ...record.publication.renderErrors],
      values: Object.keys(values).map((key) => ({
        name: key,
        value:
          typeof values[key] === "string"
            ? (values[key] as string)
            : JSON.stringify(values[key] ?? null),
      })),
      waiting: record.events.length,
      queries: record.publication.queries,
      failures: record.publication.failures,
      statements: record.parse.statements,
    };

    const head = statusTable({
      program: details.name,
      statements: details.statements,
      drawn: record.publication.drawn.length,
      errors: details.errors.length,
      interactions: details.waiting,
      ...(details.streaming ? { streaming: "yes" } : {}),
      ...(details.live ? { showing: "yes" } : {}),
    });

    return toolResult(
      blocks(
        head,
        `${programWord(record.name)} — ${counted(drawn.length, "component")}${
          omitted === 0 ? "" : ` (${String(omitted)} more)`
        }`,
        drawn.length === 0
          ? "nothing has been painted from this program yet"
          : drawn.join(", "),
        details.unresolved.length === 0
          ? ""
          : `unresolved: ${details.unresolved.join(", ")}`,
        details.errors.length === 0 ? "" : diagnosticTable(details.errors),
        details.values.length === 0 ? "" : valueTable(details.values),
        details.queries.length === 0 ? "" : queryLines(details.queries),
        details.failures.length === 0
          ? ""
          : `query failures:\n${details.failures.join("\n")}`,
        details.waiting === 0
          ? ""
          : `${String(details.waiting)} interactions waiting — read them with openui-events`,
        details.truncated
          ? "the source is cut: read it in pieces with a limit"
          : "",
        moreLine(omitted, "component"),
      ),
      details,
    );
  },
};
