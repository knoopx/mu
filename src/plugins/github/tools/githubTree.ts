/**
 * `github-tree` — one folder of a repository, as its children list them.
 *
 * An empty `path` is the repository root. The listing is the shape of a project
 * before any of its files are read, so it is the cheapest read that answers
 * "where does this project keep the thing".
 */

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { GITHUB_TOOL_LABELS, GITHUB_TREE_TOOL } from "../constants";
import { readTree } from "../lib/api/read";
import {
  ownerParam,
  pathParam,
  refreshParam,
  refParam,
  repoParam,
} from "../lib/params";
import { runRead } from "../lib/reader";
import type { GithubCall, GithubTreeParams } from "../types";
import { GITHUB_GUIDELINES } from "./guidelines";

const Parameters = Type.Object({
  owner: ownerParam(),
  repo: repoParam(),
  path: Type.Optional(pathParam("folder; empty is the repository root")),
  ref: refParam(),
  refresh: refreshParam(),
});

export async function executeGithubTree(
  params: GithubTreeParams,
  signal?: AbortSignal,
): Promise<AgentToolResult<GithubCall>> {
  return runRead(readTree, { ...params, signal });
}

export const githubTreeTool: ToolDefinition<typeof Parameters, GithubCall> = {
  name: GITHUB_TREE_TOOL,
  label: GITHUB_TOOL_LABELS[GITHUB_TREE_TOOL],
  description:
    "Lists one folder of a GitHub repository — name, type (dir, file, symlink, submodule), " +
    "size and full path of each entry, ranked. An empty `path` lists the repository root. " +
    "This is how the shape of a remote project is read before any of its files are. " +
    "Read-only.",
  promptSnippet: "List a folder of a GitHub repository at a ref",
  promptGuidelines: [
    ...GITHUB_GUIDELINES,
    "Walk a remote project from its root down: github-tree says which folder a file lives in, and github-file reads the one you picked.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params, signal) {
    return executeGithubTree(params, signal);
  },
};
