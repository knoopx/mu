/**
 * `github-repo` — what a repository is: what it does, how much it is used, and
 * what its default branch is called, which is what every later read inherits.
 */

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { GITHUB_REPO_TOOL, GITHUB_TOOL_LABELS } from "../constants";
import { readRepo } from "../lib/api/read";
import { ownerParam, refreshParam, repoParam } from "../lib/params";
import { runRead } from "../lib/reader";
import type { GithubCall, GithubRepoParams } from "../types";
import { GITHUB_GUIDELINES } from "./guidelines";

const Parameters = Type.Object({
  owner: ownerParam(),
  repo: repoParam(),
  refresh: refreshParam(),
});

export async function executeGithubRepo(
  params: GithubRepoParams,
  signal?: AbortSignal,
): Promise<AgentToolResult<GithubCall>> {
  return runRead(readRepo, { ...params, signal });
}

export const githubRepoTool: ToolDefinition<typeof Parameters, GithubCall> = {
  name: GITHUB_REPO_TOOL,
  label: GITHUB_TOOL_LABELS[GITHUB_REPO_TOOL],
  description:
    "Reads one GitHub repository: description, stars, forks, language, licence, " +
    "visibility, open issues, size, when it was last pushed and its default branch. " +
    "The default branch is what a later `ref` stands beside; the description and licence " +
    "are the answer when the question is what a project is and whether it can be used. " +
    "Read-only.",
  promptSnippet:
    "Read a GitHub repository's metadata, counts and default branch",
  promptGuidelines: [
    ...GITHUB_GUIDELINES,
    "Start a repo you have not read with github-repo: its default branch, star count and licence decide whether the rest of the reads are worth making.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params, signal) {
    return executeGithubRepo(params, signal);
  },
};
