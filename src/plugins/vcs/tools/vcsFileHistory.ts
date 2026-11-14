/**
 * Which revisions touched a path.
 *
 * A path and a revision id are both one string, so the shape of the token
 * decides which it is. The rows carry the ids the next read needs, which is
 * why this tool comes before the one that shows a file's body.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type { PluginTool } from "../../core/lib/plugin/manifest";
import { VCS_FILE_HISTORY_TOOL } from "../constants";
import {
  failedResult,
  missingResult,
  noRepoResult,
  type VcsBlank,
} from "../lib/answer";
import { limitParam, offsetParam } from "../lib/params";
import { jjRoot, runFileHistory } from "../lib/ops";
import { tableOf, toolResult } from "../../core/lib/agent/toolText";
import type { VcsFileHistoryDetails, VcsFileHistoryParams } from "../types";

const Parameters = Type.Object({
  path: Type.String({
    description:
      "File path (absolute, or relative to the working directory), or a revision ID (jj change ID, jj commit ID, or revset).",
  }),
  limit: limitParam("revisions", 20),
  offset: offsetParam("revisions"),
});

/** `empty` is an answer here, not a failure: the path may be new, or spelled differently than the repo has it. */
export async function executeVcsFileHistory(
  params: VcsFileHistoryParams,
): Promise<AgentToolResult<VcsFileHistoryDetails>> {
  const path = params.path.trim();
  const blank: VcsBlank<VcsFileHistoryDetails> = {
    vcs: "jj",
    path,
    revision_count: 0,
    rows: [],
  };

  if (path.length === 0) return missingResult(blank, "path");
  if (jjRoot() === null) return noRepoResult(blank);

  const found = await runFileHistory(path, params.limit, params.offset);
  if (found.status === "failed") return failedResult(blank, found.error);

  const text =
    found.rows.length === 0
      ? `no revisions touch ${path}`
      : tableOf(
          found.rows.map((row, index) => ({
            "#": String(index + 1 + (params.offset ?? 0)),
            hash: row.hash,
            change: row.change,
            author: row.author,
            date: row.date,
            subject: row.subject,
          })),
        );

  return toolResult(text, {
    ...blank,
    status: found.status,
    revision_count: found.rows.length,
    rows: found.rows,
    error: "",
  });
}

/** Read-only, and always bounded — an unbounded answer is the whole repo's history. */
export const vcsFileHistoryTool: PluginTool<
  typeof Parameters,
  VcsFileHistoryDetails
> = {
  name: VCS_FILE_HISTORY_TOOL,
  icon: "history",
  label: "VCS file history",
  description:
    "Lists the revisions that touched a file in a jujutsu repo, newest first: the RESOLVED " +
    "commit hash, the jj change id, the author, the date and the first description line, " +
    'numbered 1..N. A path is read as a path (`files(root:"…")`); a token that reads as a ' +
    "revision id is read as that revision. jj-only — no `.jj/` marker above the working " +
    "directory is `unsupported`, and no git command runs. Read-only: the repo is never mutated.",
  promptSnippet:
    "List the revisions that touched a file, with resolved hashes and change ids",
  promptGuidelines: [
    "Use vcs-file-history before vcs-file-history-show: it returns the revision ids the show tool needs.",
    "A file with no revisions is not an error — the path may be new, or spelled differently than the repo has it.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeVcsFileHistory(params);
  },
};
