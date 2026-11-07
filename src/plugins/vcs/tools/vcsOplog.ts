/**
 * The repo's own history of operations.
 *
 * Only this plugin can read it, and it only reads: an operation is reversed
 * by a write the user has to ask for, and mu ships no tool for one.
 */

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { VCS_OPLOG_TOOL } from "../constants";
import { NOT_A_JJ_REPO, jjRoot, runOplog } from "../lib/ops";
import { blocks, statusTable, tableOf, toolResult } from "../../core/lib/agent/toolText";
import type { VcsOplogDetails, VcsOplogParams } from "../types";

const Parameters = Type.Object({
  limit: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: 500,
      description: "Cap on operations (default 25).",
    }),
  ),
  offset: Type.Optional(
    Type.Number({
      minimum: 0,
      description: "Skip the first N operations (default 0).",
    }),
  ),
  oldest_first: Type.Optional(
    Type.Boolean({ description: "Oldest-first ordering (jj `--reversed`)." }),
  ),
  format: Type.Optional(
    Type.Union([Type.Literal("compact"), Type.Literal("full")], {
      description:
        "`compact` truncates the op id to 12 characters and the description to 120; `full` keeps both whole.",
    }),
  ),
});

/** `full` is for when an op id has to be whole; compact is the transcript's budget. */
export async function executeVcsOplog(
  params: VcsOplogParams,
): Promise<AgentToolResult<VcsOplogDetails>> {
  if (jjRoot() === null)
    return toolResult(NOT_A_JJ_REPO, {
      vcs: "",
      status: "unsupported",
      op_count: 0,
      rows: [],
      error: NOT_A_JJ_REPO,
    });

  const found = await runOplog(
    params.limit,
    params.offset,
    params.oldest_first,
    params.format === "full",
  );

  if (found.status === "failed")
    return toolResult(found.error, {
      vcs: "jj",
      status: "failed",
      op_count: 0,
      rows: [],
      error: found.error,
    });

  const text =
    found.rows.length === 0
      ? "no operations in the op log"
      : blocks(
          statusTable({ vcs: "jj", status: "ok" }),
          tableOf(
            found.rows.map((row) => ({
              op: row.op,
              time: row.time,
              description: row.description,
            })),
          ),
        );

  return toolResult(text, {
    vcs: "jj",
    status: found.status,
    op_count: found.rows.length,
    rows: found.rows,
    error: "",
  });
}

/** Read-only: it says what happened, and never undoes it. */
export const vcsOplogTool: ToolDefinition<typeof Parameters, VcsOplogDetails> =
  {
    name: VCS_OPLOG_TOOL,
    label: "VCS operation log",
    description:
      "Lists the jujutsu operation log — one row per operation, with its id, its start/end " +
      "timestamps and its description, newest first. The operation log is a jj concept: a " +
      "location without a `.jj/` marker is `unsupported`. Read-only — only `jj op log` runs, " +
      "nothing is restored or abandoned. Use it when jj state needs debugging.",
    promptSnippet:
      "List the jj operation log, newest-first, with ids and descriptions",
    promptGuidelines: [
      "Read the op log with vcs-oplog, not `jj op log` in bash.",
      "Restoring an operation is a write the user must ask for; the op log only shows what happened.",
    ],

    executionMode: "parallel",
    parameters: Parameters,

    async execute(_toolCallId, params) {
      return executeVcsOplog(params);
    },
  };
