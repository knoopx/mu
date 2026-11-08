/**
 * What is actually conflicted, which is not what a warning in a prompt says.
 *
 * A clean repo gets its own status (`none`) so the log answers with a check
 * rather than an empty table, and an empty scope means the working copy
 * alone — the one conflict the user can be standing in.
 */

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { VCS_CONFLICTS_TOOL } from "../constants";
import { failedResult, noRepoResult, type VcsBlank } from "../lib/answer";
import { jjRoot, runConflicts } from "../lib/ops";
import { blocks, statusTable, tableOf, toolResult } from "../../core/lib/agent/toolText";
import type { VcsConflictsDetails, VcsConflictsParams } from "../types";

const Parameters = Type.Object({
  rev: Type.Optional(
    Type.String({
      description:
        "Revision scope — a jj change ID, commit ID, or revset (e.g. `@`, `@-`); the search is `rev::conflicts()`. Empty reads the working copy only.",
    }),
  ),
});

/** Every conflicted revision is listed on its own: a conflict is per file, per revision, never global. */
export async function executeVcsConflicts(
  params: VcsConflictsParams,
): Promise<AgentToolResult<VcsConflictsDetails>> {
  const rev = (params.rev ?? "").trim();

  const blank: VcsBlank<VcsConflictsDetails> = {
    vcs: "jj",
    rev,
    conflict_count: 0,
    file_count: 0,
    rows: [],
  };

  if (jjRoot() === null) return noRepoResult(blank);

  const found = await runConflicts(rev);

  if (found.status === "failed") return failedResult(blank, found.error);

  const text =
    found.status === "none"
      ? "no conflicts found"
      : blocks(
          statusTable({ vcs: "jj", rev: found.scope, status: "ok" }),
          tableOf(
            found.rows.map((row) => ({
              change: row.change,
              commit: row.commit,
              path: row.path,
              sides: row.sides,
              status: row.working_copy ? "working-copy" : "commit",
            })),
          ),
          found.note,
        );

  return toolResult(text, {
    ...blank,
    status: found.status,
    conflict_count: found.revisions,
    file_count: found.rows.length,
    rows: found.rows,
    error: "",
  });
}

/** Read-only — a conflict is reported, never merged, and no merge tool is started. */
export const vcsConflictsTool: ToolDefinition<
  typeof Parameters,
  VcsConflictsDetails
> = {
  name: VCS_CONFLICTS_TOOL,
  label: "VCS conflicts",
  description:
    "Reports the ACTUAL unresolved conflicts of a jujutsu repo: the conflicted revisions (the " +
    "`conflicts()` revset inside a scope) and, per revision, the conflicted files with their " +
    "sides — one row per file with the change, commit, path, side count, and whether it sits " +
    "in the working copy. Empty scope reads the working copy alone. jj-only: a location " +
    "without a `.jj/` marker is `unsupported`. Read-only — `jj log` and `jj resolve --list` " +
    "only, no merge tool is started.",
  promptSnippet:
    "List the revisions and files that are actually conflicted in a jj repo",
  promptGuidelines: [
    "Check vcs-conflicts before writing a description or splitting: a conflict is the state a message has to account for.",
    "`sides` names the sides of each conflict; an empty `sides` means `jj resolve --list` reported the file with no side counts.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeVcsConflicts(params);
  },
};
