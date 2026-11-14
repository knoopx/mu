import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import {
  CODE_SYMBOL_REFERENCES_TOOL,
  DEFAULT_FINDING_LIMIT,
  DEFAULT_TRACE_DEPTH,
  MAX_TRACE_DEPTH,
} from "../constants";
import type { PluginTool } from "../../core/lib/plugin/manifest";
import { fallowTrace } from "../lib/fallow";
import {
  blocks,
  counted,
  missing,
  moreLine,
  statusTable,
  tableOf,
  toolResult,
} from "../../core/lib/agent/toolText";
import { answerUnlessOk } from "../lib/answer";
import { limitParam } from "../lib/params";
import type {
  CodeSymbolReferencesDetails,
  CodeSymbolReferencesParams,
} from "../types";

const Parameters = Type.Object({
  symbol: Type.String({
    minLength: 1,
    pattern: "^\\s*\\S",
    description:
      "The symbol to trace: `FILE:SYMBOL` (e.g. `src/plugins/vcs/lib/ops.ts:runLog`), or a bare name when `path` names the file.",
  }),
  path: Type.Optional(
    Type.String({
      description:
        "The file the bare `symbol` lives in, so the target reads `path:symbol`.",
    }),
  ),
  root: Type.Optional(
    Type.String({
      description:
        "Project root the analyser runs in (default: the working directory).",
    }),
  ),
  depth: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: MAX_TRACE_DEPTH,
      description: `How many hops to walk in each direction (default ${String(
        DEFAULT_TRACE_DEPTH,
      )}, maximum ${String(MAX_TRACE_DEPTH)}).`,
    }),
  ),
  limit: limitParam("rows to return per direction"),
});

const targetOf = (params: CodeSymbolReferencesParams): string => {
  const asked = (params.symbol ?? "").trim();
  if (asked.includes(":")) return asked;
  const file = (params.path ?? "").trim();
  return file === "" ? asked : `${file.replace(/\/$/, "")}:${asked}`;
};

const blankOf = (
  params: CodeSymbolReferencesParams,
  error: string,
): CodeSymbolReferencesDetails => ({
  analyzer: "fallow",
  version: "",
  file: (params.path ?? "").trim(),
  symbol: (params.symbol ?? "").trim(),
  status: "failed",
  found: false,
  best_effort: true,
  depth: params.depth ?? DEFAULT_TRACE_DEPTH,
  reason: "",
  caller_count: 0,
  callee_count: 0,
  unresolved_count: 0,
  callers: [],
  callees: [],
  omitted: 0,
  elapsed_ms: 0,
  error,
});

async function executeCodeSymbolReferences(
  params: CodeSymbolReferencesParams,
): Promise<AgentToolResult<CodeSymbolReferencesDetails>> {
  if ((params.symbol ?? "").trim() === "")
    return toolResult(missing("symbol"), blankOf(params, missing("symbol")));

  const target = targetOf(params);
  if (!target.includes(":"))
    return toolResult(
      "name the symbol as `FILE:SYMBOL`, or give `path` with a bare `symbol`",
      blankOf(params, "the trace target must read FILE:SYMBOL"),
    );

  const details = await fallowTrace(
    target,
    params.root,
    params.depth ?? DEFAULT_TRACE_DEPTH,
    params.limit ?? DEFAULT_FINDING_LIMIT,
  );

  const head = statusTable({
    target,
    depth: details.depth,
    symbol_found: details.found ? "yes" : "no",
    status: details.status,
  });

  const nothing = answerUnlessOk(
    head,
    details,
    `no call chain reaches ${target}`,
  );
  if (nothing !== null) return nothing;

  const rows = (
    list: CodeSymbolReferencesDetails["callers"],
    direction: string,
  ): string =>
    blocks(
      `${direction} — ${counted(
        direction === "callers" ? details.caller_count : details.callee_count,
        direction === "callers" ? "caller" : "callee",
      )}`,
      tableOf(
        list.map((row) => ({
          hop: row.depth,
          name: row.name,
          file: row.file,
          type_only: row.type_only ? "yes" : "",
        })),
      ),
    );

  return toolResult(
    blocks(
      head,
      rows(details.callers, "callers"),
      rows(details.callees, "callees"),
      moreLine(details.omitted, "edge"),
      `${counted(
        details.caller_count,
        "caller",
      )} walk up to the symbol and ${counted(
        details.callee_count,
        "callee",
      )} walk down, to depth ${String(
        details.depth,
      )}; ${String(details.unresolved_count)} callees could not be resolved.`,
      details.reason,
    ),
    details,
  );
}

export const codeSymbolReferencesTool: PluginTool<
  typeof Parameters,
  CodeSymbolReferencesDetails
> = {
  name: CODE_SYMBOL_REFERENCES_TOOL,
  icon: "accountTree",
  label: "Symbol references",
  description:
    "Traces a symbol's call chain — the files that import it (callers) and the symbols it " +
    "reaches (callees) — as rows of hop, name, file and whether the edge is type-only, with " +
    "the counts for each direction and how many callees the walk could not resolve. The target " +
    "is `FILE:SYMBOL`; `depth` bounds how far each direction walks. The walk is best-effort and " +
    "syntactic, so it is a survey of who could be affected, not a compiler's answer. Read-only.",
  promptSnippet: "Trace who calls a symbol and what it calls, hop by hop",
  promptGuidelines: [
    "Read code-symbol-references before changing or deleting a symbol — never reach for a shell command instead of it.",
    "Name the target as `FILE:SYMBOL`; a bare name needs `path`, or the call cannot resolve it.",
    "Treat an unresolved callee as unknown, not absent: confirm with a read of the call site before relying on it.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeCodeSymbolReferences(params);
  },
};
