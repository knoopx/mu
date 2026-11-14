/**
 * `github-commit` — one commit and the files it moved.
 *
 * The subject line carries the answer and the full message follows only when it
 * has one; the file rows carry what a change actually touched.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type { PluginTool } from "../../core/lib/plugin/manifest";
import { GITHUB_COMMIT_TOOL, GITHUB_TOOL_LABELS } from "../constants";
import { readCommit } from "../lib/api/read/commit";
import { ownerParam, refreshParam, repoParam, shaParam } from "../lib/params";
import { runRead } from "../lib/reader";
import type { GithubCall, GithubCommitParams } from "../types";
import { GITHUB_GUIDELINES } from "./guidelines";

const Parameters = Type.Object({
  owner: ownerParam(),
  repo: repoParam(),
  sha: shaParam(),
  refresh: refreshParam(),
});

async function executeGithubCommit(
  params: GithubCommitParams,
  signal?: AbortSignal,
): Promise<AgentToolResult<GithubCall>> {
  return runRead(readCommit, { ...params, signal });
}

export const githubCommitTool: PluginTool<typeof Parameters, GithubCall> = {
  name: GITHUB_COMMIT_TOOL,
  icon: "history",
  label: GITHUB_TOOL_LABELS[GITHUB_COMMIT_TOOL],
  description:
    "Reads one GitHub commit: its subject and full message, author and date, the line counts " +
    "it moved, and every file it touched as a ranked row of filename, status (added, modified, " +
    "removed, renamed) and its additions and deletions. Read-only.",
  promptSnippet: "Read a GitHub commit's message and the files it changed",
  promptGuidelines: [
    ...GITHUB_GUIDELINES,
    "When the question is why a line exists, github-commit on the SHA that moved it answers better than reasoning about the file.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params, signal) {
    return executeGithubCommit(params, signal);
  },
};
