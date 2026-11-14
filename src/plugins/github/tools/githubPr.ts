/**
 * `github-pr` — one pull request: what it changes, who opened it, and whether it landed.
 *
 * The state is resolved here rather than passed through: a closed PR with a
 * merge date is `merged`, and one with `draft` set is `draft`, which is what a
 * reader is asking about. `files` brings the changed files along with it.
 */

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { GITHUB_PR_TOOL, GITHUB_TOOL_LABELS } from "../constants";
import { readPull } from "../lib/api/read";
import {
  flagParam,
  numberParam,
  ownerParam,
  refreshParam,
  repoParam,
} from "../lib/params";
import { runRead } from "../lib/reader";
import type { GithubCall, GithubPullParams } from "../types";
import { GITHUB_GUIDELINES } from "./guidelines";

const Parameters = Type.Object({
  owner: ownerParam(),
  repo: repoParam(),
  number: numberParam("pull request"),
  files: flagParam(
    "Also list the files the pull request changes, with their status and line counts.",
  ),
  refresh: refreshParam(),
});

export async function executeGithubPr(
  params: GithubPullParams,
  signal?: AbortSignal,
): Promise<AgentToolResult<GithubCall>> {
  return runRead(readPull, { ...params, signal });
}

export const githubPrTool: ToolDefinition<typeof Parameters, GithubCall> = {
  name: GITHUB_PR_TOOL,
  label: GITHUB_TOOL_LABELS[GITHUB_PR_TOOL],
  description:
    "Reads one GitHub pull request: title, state (open, draft, closed, merged), author, " +
    "head and base branches, commit and line counts, and its description. `files` adds the " +
    "changed files with their status and additions and deletions. Read-only — it never " +
    "merges, comments, closes or pushes anything.",
  promptSnippet:
    "Read a GitHub pull request's state, description and changed files",
  promptGuidelines: [
    ...GITHUB_GUIDELINES,
    "Ask github-pr before trusting a claim about an upstream change: its state line says whether it landed, and `files` says what it touched.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params, signal) {
    return executeGithubPr(params, signal);
  },
};
