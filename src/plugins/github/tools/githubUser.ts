/**
 * `github-user` — a person or organisation: what they say they are, and what they publish.
 */

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { GITHUB_TOOL_LABELS, GITHUB_USER_TOOL } from "../constants";
import { readUser } from "../lib/api/read/user";
import { loginParam, refreshParam } from "../lib/params";
import { runRead } from "../lib/reader";
import type { GithubCall, GithubUserParams } from "../types";
import { GITHUB_GUIDELINES } from "./guidelines";

const Parameters = Type.Object({
  login: loginParam(),
  refresh: refreshParam(),
});

export async function executeGithubUser(
  params: GithubUserParams,
  signal?: AbortSignal,
): Promise<AgentToolResult<GithubCall>> {
  return runRead(readUser, { ...params, signal });
}

export const githubUserTool: ToolDefinition<typeof Parameters, GithubCall> = {
  name: GITHUB_USER_TOOL,
  label: GITHUB_TOOL_LABELS[GITHUB_USER_TOOL],
  description:
    "Reads a GitHub profile: name, bio, whether it is a user or an organisation, company, " +
    "location, how many repositories and gists they publish, followers and following, and when " +
    "they joined. Read-only.",
  promptSnippet: "Read a GitHub user or organisation profile",
  promptGuidelines: [
    ...GITHUB_GUIDELINES,
    'A maintainer\'s profile answers who stands behind a dependency; github-search with kind="repositories" lists what they publish.',
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params, signal) {
    return executeGithubUser(params, signal);
  },
};
