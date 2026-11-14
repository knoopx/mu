import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type { PluginTool } from "../../core/lib/plugin/manifest";
import { CODE_REVIEW_TOOL, DEFAULT_FINDING_LIMIT } from "../constants";
import { inspectDiff } from "../lib/review";
import {
  blocks,
  counted,
  missing,
  moreLine,
  scopeLabel,
  statusTable,
  tableOf,
  toolResult,
} from "../../core/lib/agent/toolText";
import { answerUnlessOk } from "../lib/answer";
import { limitParam } from "../lib/params";
import type { CodeReviewDetails, CodeReviewParams } from "../types";

const Parameters = Type.Object({
  target: Type.String({
    minLength: 1,
    pattern: "^\\s*\\S",
    description:
      "Commit ref or range to review (e.g. `HEAD~1`, `main..feature`, `abc123`).",
  }),
  repo: Type.Optional(
    Type.String({
      description:
        "Repository path to review in (default: the working directory).",
    }),
  ),
  min_risk: Type.Optional(
    Type.Union(
      [
        Type.Literal("any"),
        Type.Literal("low"),
        Type.Literal("medium"),
        Type.Literal("high"),
        Type.Literal("critical"),
      ],
      {
        description:
          "Drop rows below this risk level (`any` keeps every row, the default).",
      },
    ),
  ),
  limit: limitParam("entities to return, riskiest first"),
});

/** The answer of a call that never reached the analyser: the same shape, failed. */
const blankOf = (
  params: CodeReviewParams,
  error: string,
): CodeReviewDetails => ({
  analyzer: "inspect",
  target: (params.target ?? "").trim(),
  repo: params.repo ?? "",
  status: "failed",
  entities_changed: 0,
  risk_counts: [],
  change_counts: [],
  groups: 0,
  entities_in_graph: 0,
  rows: [],
  omitted: 0,
  elapsed_ms: 0,
  error,
});

async function executeCodeReview(
  params: CodeReviewParams,
): Promise<AgentToolResult<CodeReviewDetails>> {
  const target = (params.target ?? "").trim();
  if (target === "")
    return toolResult(missing("target"), blankOf(params, missing("target")));

  const details = await inspectDiff(
    target,
    params.repo,
    params.min_risk,
    params.limit ?? DEFAULT_FINDING_LIMIT,
  );

  const risks = details.risk_counts
    .map((entry) => `${String(entry.count)} ${entry.kind}`)
    .join(", ");

  const head = statusTable({
    target: details.target,
    repo: scopeLabel(details.repo),
    entities_changed: details.entities_changed,
    groups: details.groups,
    status: details.status,
  });

  const nothing = answerUnlessOk(
    head,
    details,
    `no entities changed in ${details.target}`,
  );
  if (nothing !== null) return nothing;

  return toolResult(
    blocks(
      head,
      tableOf(
        details.rows.map((row) => ({
          risk: row.risk,
          type: row.type,
          entity: row.entity,
          file: row.file,
          at: row.at,
          score: row.score.toFixed(2),
          blast: row.blast,
          change: row.change,
          public_api: row.public_api ? "yes" : "",
        })),
      ),
      moreLine(details.omitted, "entity"),
      `${counted(
        details.entities_changed,
        "entity",
      )} changed${risks === "" ? "" : ` — ${risks}`}; the graph holds ${String(
        details.entities_in_graph,
      )} entities.`,
    ),
    details,
  );
}

export const codeReviewTool: PluginTool<typeof Parameters, CodeReviewDetails> =
  {
    name: CODE_REVIEW_TOOL,
    icon: "rateReview",
    label: "Change review",
    description:
      "Runs entity-level change analysis on a commit or range and answers with one row per " +
      "changed entity — risk level, entity type and name, file, line range, risk score, blast " +
      "radius, whether it is public API, and how it changed (added, modified, deleted) — riskiest " +
      "first. `min_risk` drops the quiet rows; the risk mix of the whole change is stated even " +
      "when the rows are bounded. Read-only.",
    promptSnippet:
      "Score a commit's entity-level impact — risk, blast radius, what changed",
    promptGuidelines: [
      "Read a change's blast radius with code-review before merging or refactoring on top of it — never reach for a shell command instead of it.",
      "Name the ref you mean (`HEAD~1`, `main..feature`); a range is one call, not two.",
      "A critical row is where to look first, not what to revert: check its dependents before touching it.",
    ],

    executionMode: "parallel",
    parameters: Parameters,

    async execute(_toolCallId, params) {
      return executeCodeReview(params);
    },
  };
