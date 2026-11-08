/**
 * `openui-validate` — parse a program and answer with the diagnostics, without
 * putting it in the log.
 */

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { MAX_COMPONENT_ROWS, OPENUI_VALIDATE_TOOL } from "../constants";
import type { OpenUIValidateDetails } from "../types";
import {
  blocks,
  counted,
  moreLine,
  statusTable,
  toolResult,
} from "../../core/lib/agent/toolText";
import { codeParam } from "../lib/params";
import { diagnosticTable, queryLines, stateSource, valueRows } from "../lib/format";
import { declaresRoot, parseProgram } from "../lib/analysis/parse";
import { noRootHint } from "../lib/answer";
import { VALIDATE_GUIDELINES } from "./guidelines";

const ValidateParametersSchema = Type.Object({
  code: codeParam,
});

export const openUIValidateTool: ToolDefinition<
  typeof ValidateParametersSchema,
  OpenUIValidateDetails
> = {
  name: OPENUI_VALIDATE_TOOL,
  label: OPENUI_VALIDATE_TOOL,
  description:
    "Parse OpenUI Lang source against this app's library and answer with the diagnostics — statements, the components it would draw, unresolved names, and every error with the move that clears it — without rendering anything. Use it to check a program, or to re-check an edit, before committing it with openui-render.",
  promptSnippet: "Parse an OpenUI Lang program for diagnostics without rendering it",
  promptGuidelines: [...VALIDATE_GUIDELINES],

  executionMode: "parallel",
  parameters: ValidateParametersSchema,

  async execute(_toolCallId, params): Promise<AgentToolResult<OpenUIValidateDetails>> {
    const source = stateSource(params.code ?? "");
    const { parse } = parseProgram(source.text);
    const hard = parse.diagnostics.filter((row) => row.severity === "error");
    const drawn = parse.components.slice(0, MAX_COMPONENT_ROWS);
    const omitted = parse.components.length - drawn.length;

    const details: OpenUIValidateDetails = {
      status: "ok",
      error: "",
      ok: parse.ok,
      name: "",
      chars: source.text.length,
      statements: parse.statements,
      components: drawn,
      unresolved: parse.unresolved,
      orphaned: parse.orphaned,
      incomplete: parse.incomplete,
      diagnostics: parse.diagnostics,
      queries: parse.queries,
      values: valueRows(parse.variables),
    };

    const head = statusTable({
      chars: details.chars,
      statements: details.statements,
      ok: details.ok ? "yes" : "no",
      errors: hard.length,
      unresolved: parse.unresolved.length,
      ...(parse.incomplete ? { incomplete: "yes" } : {}),
    });

    const lines = [
      head,
      counted(drawn.length, "component") +
        (omitted === 0 ? "" : ` (${String(omitted)} more)`),
      drawn.length === 0 ? "" : drawn.join(", "),
      parse.unresolved.length === 0
        ? ""
        : `unresolved: ${parse.unresolved.join(", ")}`,
      parse.orphaned.length === 0
        ? ""
        : `never reached from root: ${parse.orphaned.join(", ")}`,
      parse.queries.length === 0 ? "" : queryLines(parse.queries),
      hard.length === 0 ? "" : diagnosticTable(hard),
      hard.length === 0 || declaresRoot(source.text)
        ? ""
        : noRootHint(),
      moreLine(omitted, "component"),
    ];

    return toolResult(blocks(...lines), details);
  },
};
