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
import { failedResult, noRepoResult, type VcsBlank } from "../lib/answer";
import {
  formatParam,
  limitParam,
  offsetParam,
  oldestFirstParam,
} from "../lib/params";
import { jjRoot, runOplog } from "../lib/ops";
import { blocks, statusTable, tableOf, toolResult } from "../../core/lib/agent/toolText";
import type { VcsOplogDetails, VcsOplogParams } from "../types";

const Parameters = Type.Object({
  limit: limitParam("operations"),
  offset: offsetParam("operations"),
  oldest_first: oldestFirstParam(),
  format: formatParam(
    "truncates the op id to 12 characters and the description to 120",
    "keeps both whole",
  ),
});

/** `full` is for when an op id has to be whole; compact is the transcript's budget. */
export async function executeVcsOplog(
  params: VcsOplogParams,
): Promise<AgentToolResult<VcsOplogDetails>> {
  const blank: VcsBlank<VcsOplogDetails> = { vcs: "jj", op_count: 0, rows: [] };

  if (jjRoot() === null) return noRepoResult(blank);

  const found = await runOplog(
    params.limit,
    params.offset,
    params.oldest_first,
    params.format === "full",
  );

  if (found.status === "failed") return failedResult(blank, found.error);

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
    ...blank,
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
