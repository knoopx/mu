/**
 * `github-issue` — one issue and the thread it carries.
 *
 * GitHub answers issues and pull requests from one endpoint; the tool does not
 * pass that confusion on — a number that turns out to be a pull request is
 * answered as one and sent to `github-pr`.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import {
  DEFAULT_COMMENT_LIMIT,
  GITHUB_ISSUE_TOOL,
  GITHUB_TOOL_LABELS,
  MAX_COMMENT_LIMIT,
} from "../constants";
import type { PluginTool } from "../../core/lib/plugin/manifest";
import { readIssue } from "../lib/api/read/issue";
import {
  limitParam,
  numberParam,
  ownerParam,
  refreshParam,
  repoParam,
} from "../lib/params";
import { runRead } from "../lib/reader";
import type { GithubCall, GithubIssueParams } from "../types";
import { GITHUB_GUIDELINES } from "./guidelines";

const Parameters = Type.Object({
  owner: ownerParam(),
  repo: repoParam(),
  number: numberParam("issue"),
  limit: limitParam("comments", DEFAULT_COMMENT_LIMIT, MAX_COMMENT_LIMIT),
  refresh: refreshParam(),
});

export async function executeGithubIssue(
  params: GithubIssueParams,
  signal?: AbortSignal,
): Promise<AgentToolResult<GithubCall>> {
  return runRead(readIssue, { ...params, signal });
}

export const githubIssueTool: PluginTool<typeof Parameters, GithubCall> = {
  name: GITHUB_ISSUE_TOOL,
  icon: "circleOutline",
  label: GITHUB_TOOL_LABELS[GITHUB_ISSUE_TOOL],
  description:
    "Reads one GitHub issue: title, state (with why it was closed), author, labels, dates, " +
    "its description, and its comments as ranked rows of author, text and date. A number " +
    "that is really a pull request is answered as one, pointed at github-pr. Read-only — it " +
    "never comments or closes anything.",
  promptSnippet: "Read a GitHub issue with its comments",
  promptGuidelines: [
    ...GITHUB_GUIDELINES,
    "An issue's comments are where a bug's actual cause usually surfaces: `limit` widens the thread when the first twenty replies are not enough.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params, signal) {
    return executeGithubIssue(params, signal);
  },
};
