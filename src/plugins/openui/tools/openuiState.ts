/**
 * `openui-state` — what the renderer published for a program: its source, the
 * components it actually drew, the values the human left, and what is waiting.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type { PluginTool } from "../../core/lib/plugin/manifest";
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
import { programStore, type ProgramRecord } from "../lib/programStore/store";
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

export const openUIStateTool: PluginTool<
  typeof StateParametersSchema,
  OpenUIStateDetails
> = {
  name: OPENUI_STATE_TOOL,
  icon: "queryStats",
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
    if (record === undefined) return nothingToRead(params.name ?? "");

    const drawn = record.publication.drawn.slice(0, MAX_COMPONENT_ROWS);
    const omitted = record.publication.drawn.length - drawn.length;
    const details = stateDetails(record, drawn);

    return toolResult(
      blocks(headLine(record, details), ...stateLines(details, drawn, omitted)),
      details,
    );
  },
};

/** A name the log does not hold: the one answer with no program behind it. */
function nothingToRead(name: string): AgentToolResult<OpenUIStateDetails> {
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

/** One value as the model reads it: a string stays a string, anything else is
 *  the JSON the renderer was handed. */
const valueCell = (value: unknown): string =>
  typeof value === "string" ? value : JSON.stringify(value ?? null);

/** What the program is: its source, what it drew, what the human left behind. */
function stateDetails(
  record: ProgramRecord,
  drawn: string[],
): OpenUIStateDetails {
  const source = stateSource(record.source);
  const values = programStore.valuesOf(record);
  return {
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
    values: Object.entries(values).map(([name, value]) => ({
      name,
      value: valueCell(value),
    })),
    waiting: record.events.length,
    queries: record.publication.queries,
    failures: record.publication.failures,
    statements: record.parse.statements,
  };
}

/** The status row: every figure of the program in one line, with the two flags
 *  only when they are true — a row that says "no" twice is noise. */
const headLine = (record: ProgramRecord, details: OpenUIStateDetails): string =>
  statusTable({
    program: details.name,
    statements: details.statements,
    drawn: record.publication.drawn.length,
    errors: details.errors.length,
    interactions: details.waiting,
    ...(details.streaming ? { streaming: "yes" } : {}),
    ...(details.live ? { showing: "yes" } : {}),
  });

/**
 * What the answer says, one block per thing the program has to report.
 *
 * A section that has nothing to say is an empty string, and `blocks` drops it: a
 * program with no diagnostics, no values and no waiting interactions is its status
 * row and the components it painted, with no headings standing over nothing.
 */
function stateLines(
  details: OpenUIStateDetails,
  drawn: readonly string[],
  omitted: number,
): string[] {
  return [
    `${programWord(details.name)} — ${counted(drawn.length, "component")}${
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
      : `${counted(details.waiting, "interaction")} waiting — read them with openui-events`,
    details.truncated
      ? "the source is cut: read it in pieces with a limit"
      : "",
    moreLine(omitted, "component"),
  ];
}
