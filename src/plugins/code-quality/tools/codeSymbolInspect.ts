import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type { PluginTool } from "../../core/lib/plugin/manifest";
import { CODE_SYMBOL_INSPECT_TOOL, DEFAULT_FINDING_LIMIT } from "../constants";
import { fallowInspect } from "../lib/fallow";
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
  CodeSymbolInspectDetails,
  CodeSymbolInspectParams,
} from "../types";

const Parameters = Type.Object({
  path: Type.String({
    minLength: 1,
    pattern: "^\\s*\\S",
    description:
      "File to read, project-relative (e.g. `src/plugins/vcs/lib/ops.ts`).",
  }),
  symbol: Type.Optional(
    Type.String({
      description:
        "Export in that file to narrow the bundle to one symbol (e.g. `runLog`). Empty reads the whole file.",
    }),
  ),
  root: Type.Optional(
    Type.String({
      description:
        "Project root the analyser runs in (default: the working directory).",
    }),
  ),
  limit: limitParam("exports and hotspots to return"),
});

/** The answer of a call that never reached the analyser: the same shape, failed. */
const blankOf = (
  params: CodeSymbolInspectParams,
  error: string,
): CodeSymbolInspectDetails => ({
  analyzer: "fallow",
  version: "",
  path: "",
  symbol: params.symbol ?? "",
  status: "failed",
  reachable: false,
  entry_point: false,
  used: false,
  reason: "",
  export_count: 0,
  import_count: 0,
  imported_by_count: 0,
  rows: [],
  hotspots: [],
  duplicates: 0,
  omitted: 0,
  error,
});

/** The file's surface: one line per export and how many files read it. */
const surfaceOf = (details: CodeSymbolInspectDetails): string =>
  tableOf(
    details.rows.map((row) => ({
      export: row.name,
      read_by: row.consumers,
      type_only: row.type_only ? "yes" : "",
    })),
  );

/** The file's own complexity, as a section only when it has any. */
const hotspotsOf = (details: CodeSymbolInspectDetails): string =>
  details.hotspots.length === 0
    ? ""
    : blocks(
        "complexity in this file",
        tableOf(
          details.hotspots.map((row) => ({
            at: row.at,
            symbol: row.symbol,
            cc: row.cyclomatic,
            cognitive: row.cognitive,
            crap: Math.round(row.crap),
            severity: row.severity,
          })),
        ),
      );

async function executeCodeSymbolInspect(
  params: CodeSymbolInspectParams,
): Promise<AgentToolResult<CodeSymbolInspectDetails>> {
  const file = (params.path ?? "").trim();
  if (file === "")
    return toolResult(missing("path"), blankOf(params, missing("path")));

  const details = await fallowInspect(
    file,
    params.symbol,
    params.root,
    params.limit ?? DEFAULT_FINDING_LIMIT,
  );

  const head = statusTable({
    file: details.path,
    symbol: details.symbol,
    reachable: details.reachable ? "yes" : "no",
    entry_point: details.entry_point ? "yes" : "no",
    status: details.status,
  });

  const nothing = answerUnlessOk(head, details, `${file} has no exports`);
  if (nothing !== null) return nothing;

  const surface = surfaceOf(details);
  const hotspots = hotspotsOf(details);

  return toolResult(
    blocks(
      head,
      surface,
      moreLine(details.omitted, "export"),
      hotspots,
      details.reason === ""
        ? `${counted(details.export_count, "export")} — read by ${String(
            details.imported_by_count,
          )} file(s), imports ${String(details.import_count)}.`
        : details.reason,
    ),
    details,
  );
}

export const codeSymbolInspectTool: PluginTool<
  typeof Parameters,
  CodeSymbolInspectDetails
> = {
  name: CODE_SYMBOL_INSPECT_TOOL,
  icon: "category",
  label: "File surface",
  description:
    "Answers what a file exposes and who uses it: one row per export with the number of " +
    "files that read it and whether it is type-only, plus whether the file is reachable and " +
    "an entry point, its import counts, the complexity hotspots inside it, and any clone " +
    "matches. `symbol` narrows the same bundle to one export and says why it is used or unused. " +
    "Read this before changing a file you did not write. Read-only.",
  promptSnippet:
    "Read one file's exports, who reads them, and its own complexity hotspots",
  promptGuidelines: [
    "Read code-symbol-inspect before editing an unfamiliar file — never reach for a shell command instead of it.",
    "An export read by zero files is a deletion candidate: confirm with code-dead-code rather than trusting one row.",
    "`symbol` answers one export's evidence; leave it empty to see the whole surface at once.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeCodeSymbolInspect(params);
  },
};
