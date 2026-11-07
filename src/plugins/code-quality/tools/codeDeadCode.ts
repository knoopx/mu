

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { CODE_DEAD_CODE_TOOL, DEFAULT_FINDING_LIMIT } from "../constants";
import { fallowDeadCode } from "../lib/fallow";
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
import type { CodeDeadCodeDetails, CodeDeadCodeParams } from "../types";

const Parameters = Type.Object({
  path: Type.Optional(
    Type.String({
      description:
        "Project directory to scan (default: the working directory). The whole project graph is built either way.",
    }),
  ),
  limit: limitParam("findings to return"),
  scope: Type.Optional(
    Type.Union(
      [
        Type.Literal("all"),
        Type.Literal("files"),
        Type.Literal("exports"),
        Type.Literal("types"),
        Type.Literal("members"),
        Type.Literal("deps"),
      ],
      {
        description:
          "Which findings to answer with: `all` (default), `files`, `exports`, `types`, `members`, or `deps` for dependency hygiene.",
      },
    ),
  ),
});


async function executeCodeDeadCode(
  params: CodeDeadCodeParams,
): Promise<AgentToolResult<CodeDeadCodeDetails>> {
  const details = await fallowDeadCode(
    params.path,
    params.limit ?? DEFAULT_FINDING_LIMIT,
    params.scope,
  );

  const head = statusTable({
    scope: scopeLabel(details.path),
    filter: params.scope ?? "all",
    total_issues: details.total_issues,
    entry_points: details.entry_points,
    status: details.status,
  });

  const nothing = answerUnlessOk(head, details, "nothing unused found");
  if (nothing !== null) return nothing;

  const kinds = details.counts
    .map((entry) => `${String(entry.count)} ${entry.kind}`)
    .join(", ");

  return toolResult(
    blocks(
      head,
      tableOf(
        details.rows.map((row) => ({
          kind: row.kind,
          path: row.path,
          symbol: row.symbol,
          line: row.at,
          severity: row.severity,
          auto_fixable: row.fixable ? "yes" : "",
        })),
      ),
      moreLine(details.omitted, "finding"),
      `${counted(
        details.total_issues,
        "issue",
      )}${kinds === "" ? "" : ` — ${kinds}`}.`,
    ),
    details,
  );
}


export const codeDeadCodeTool: ToolDefinition<
  typeof Parameters,
  CodeDeadCodeDetails
> = {
  name: CODE_DEAD_CODE_TOOL,
  label: "Dead code",
  description:
    "Reads a project directory and answers with one row per " +
    "unused thing — unused files, exports, types, enum and class members, plus dependency " +
    "hygiene (unused, unlisted, duplicated exports) — each with its kind, path, symbol, line " +
    "and whether the fix is mechanical. `scope` answers one category at a time; the per-category " +
    "totals come back whether or not the rows are bounded. Read-only: nothing is deleted.",
  promptSnippet: "Find unused files, exports, types, members and dependencies before deleting them",
  promptGuidelines: [
    "Check code-dead-code before removing an export or a file — never reach for a shell command instead of it.",
    "Narrow with `scope` instead of raising `limit` past what you will act on; a 200-row list is not a plan.",
    "An unused verdict is static: before deleting, confirm nothing reaches the symbol dynamically, then delete and re-run.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeCodeDeadCode(params);
  },
};
