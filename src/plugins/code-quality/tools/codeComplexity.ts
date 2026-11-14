import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type { PluginTool } from "../../core/lib/plugin/manifest";
import { CODE_COMPLEXITY_TOOL, DEFAULT_FINDING_LIMIT } from "../constants";
import { fallowComplexity } from "../lib/fallow";
import {
  blocks,
  counted,
  moreLine,
  scopeLabel,
  statusTable,
  tableOf,
  toolResult,
} from "../../core/lib/agent/toolText";
import { answerUnlessOk } from "../lib/answer";
import { limitParam } from "../lib/params";
import type { CodeComplexityDetails, CodeComplexityParams } from "../types";

const Parameters = Type.Object({
  path: Type.Optional(
    Type.String({
      description:
        "Project directory to analyze (default: the working directory). The analyser runs there.",
    }),
  ),
  limit: limitParam("findings to return, worst first"),
  sort: Type.Optional(
    Type.Union(
      [Type.Literal("score"), Type.Literal("complexity"), Type.Literal("file")],
      {
        description:
          "`score` ranks by severity then CRAP (default); `complexity` by cyclomatic; `file` by path then line.",
      },
    ),
  ),
});

async function executeCodeComplexity(
  params: CodeComplexityParams,
): Promise<AgentToolResult<CodeComplexityDetails>> {
  const details = await fallowComplexity(
    params.path,
    params.limit ?? DEFAULT_FINDING_LIMIT,
    params.sort,
  );

  const head = statusTable({
    scope: scopeLabel(details.path),
    functions: details.functions_analyzed,
    above_threshold: details.above_threshold,
    status: details.status,
  });

  const nothing = answerUnlessOk(head, details, "no complexity findings");
  if (nothing !== null) return nothing;

  return toolResult(
    blocks(
      head,
      tableOf(
        details.rows.map((row) => ({
          at: row.at,
          path: row.path,
          symbol: row.symbol,
          cc: row.cyclomatic,
          cognitive: row.cognitive,
          crap: Math.round(row.crap),
          lines: row.lines,
          exceeded: row.exceeded,
          severity: row.severity,
        })),
      ),
      moreLine(details.omitted, "finding"),
      `${counted(
        details.above_threshold,
        "function",
      )} of ${String(details.functions_analyzed)} analyzed is over the thresholds (CC ${String(
        details.thresholds.cyclomatic,
      )}, cognitive ${String(
        details.thresholds.cognitive,
      )}, CRAP ${String(details.thresholds.crap)}).`,
    ),
    details,
  );
}

export const codeComplexityTool: PluginTool<
  typeof Parameters,
  CodeComplexityDetails
> = {
  name: CODE_COMPLEXITY_TOOL,
  icon: "analytics",
  label: "Code complexity",
  description:
    "Analyses a project directory and answers with one row per " +
    "function over the thresholds — path, symbol, line:col, cyclomatic, cognitive, CRAP, " +
    "line count, which threshold was exceeded and how severe the finding is. Rows come back " +
    "worst first and the call states how many it left out, so `limit` is the only way to " +
    "widen it. Read-only: nothing in the project is touched.",
  promptSnippet:
    "Find the functions over the complexity thresholds, ranked by severity and CRAP",
  promptGuidelines: [
    "Read complexity with code-complexity — never reach for a shell command instead of it.",
    "Bound the read with `limit` and rank it with `sort`; an unbounded read of a large project is noise, not a plan.",
    "Refactor the row you were given: split branching into named helpers so the score moves, rather than suppressing the finding.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeCodeComplexity(params);
  },
};
