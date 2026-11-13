/**
 * `github-search` — repositories, code, issues, commits and people.
 *
 * GitHub's code and commit search are signed-in reads whatever the repository
 * is, so mu says so before it asks rather than turning a 401 into a failure of
 * the call.
 */

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import {
  DEFAULT_SEARCH_LIMIT,
  GITHUB_SEARCH_TOOL,
  GITHUB_TOOL_LABELS,
  MAX_SEARCH_LIMIT,
} from "../constants";
import { readSearch } from "../lib/api/read/search";
import { kindParam, limitParam, refreshParam } from "../lib/params";
import { runRead } from "../lib/reader";
import type { GithubCall, GithubSearchParams } from "../types";
import { GITHUB_GUIDELINES } from "./guidelines";

const Parameters = Type.Object({
  query: Type.String({
    minLength: 1,
    pattern: "^\\s*\\S",
    description:
      "The search query, in GitHub's own syntax — plain words, or qualifiers like `in:name`, `language:rust`, `stars:>500`, `repo:owner/name`.",
  }),
  kind: kindParam(),
  limit: limitParam("results", DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT),
  refresh: refreshParam(),
});

export async function executeGithubSearch(
  params: GithubSearchParams,
  signal?: AbortSignal,
): Promise<AgentToolResult<GithubCall>> {
  return runRead(readSearch, { ...params, signal });
}

export const githubSearchTool: ToolDefinition<typeof Parameters, GithubCall> = {
  name: GITHUB_SEARCH_TOOL,
  label: GITHUB_TOOL_LABELS[GITHUB_SEARCH_TOOL],
  description:
    "Searches GitHub for repositories, code, issues, commits or users, ranked. The answer " +
    "names the kind searched and the total GitHub reports, and the rows are that kind's own " +
    "columns — a repository search says `repo description language stars`, a code search says " +
    "`path repo`. `code` and `commits` need a token in the environment and answer `unsupported` " +
    "without one. Read-only.",
  promptSnippet:
    "Search GitHub for repositories, code, issues, commits or users",
  promptGuidelines: [
    ...GITHUB_GUIDELINES,
    "Use github-search to find the owner and repo a later read needs, and keep the query in GitHub's syntax (`language:`, `stars:>`, `repo:`) rather than a sentence.",
    "A search hit is not an answer: read the file with github-file or the pull request with github-pr before quoting what a project does.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params, signal) {
    return executeGithubSearch(params, signal);
  },
};
