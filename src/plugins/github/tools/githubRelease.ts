/**
 * `github-release` — one release by tag, or the list of them.
 *
 * One tool covers both because the question is usually "what is the newest
 * release and what is in it": with no `tag` it answers as a ranked list, with a
 * tag it answers as the release and its notes.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import {
  DEFAULT_RELEASE_LIMIT,
  GITHUB_RELEASE_TOOL,
  GITHUB_TOOL_LABELS,
  MAX_RELEASE_LIMIT,
} from "../constants";
import type { PluginTool } from "../../core/lib/plugin/manifest";
import { readRelease } from "../lib/api/read/release";
import { limitParam, ownerParam, refreshParam, repoParam } from "../lib/params";
import { runRead } from "../lib/reader";
import type { GithubCall, GithubReleaseParams } from "../types";
import { GITHUB_GUIDELINES } from "./guidelines";

const Parameters = Type.Object({
  owner: ownerParam(),
  repo: repoParam(),
  tag: Type.Optional(
    Type.String({
      minLength: 1,
      description:
        "The release tag, e.g. `v1.3.0`. Empty answers the list of recent releases instead of one.",
    }),
  ),
  limit: limitParam("releases", DEFAULT_RELEASE_LIMIT, MAX_RELEASE_LIMIT),
  refresh: refreshParam(),
});

export async function executeGithubRelease(
  params: GithubReleaseParams,
  signal?: AbortSignal,
): Promise<AgentToolResult<GithubCall>> {
  return runRead(readRelease, { ...params, signal });
}

export const githubReleaseTool: PluginTool<typeof Parameters, GithubCall> =
  {
    name: GITHUB_RELEASE_TOOL,
    icon: "tagOutline",
    label: GITHUB_TOOL_LABELS[GITHUB_RELEASE_TOOL],
    description:
      "Reads GitHub releases. With a `tag` it reads one release — tag, name, whether it is a " +
      "prerelease or draft, its author, asset count and its notes as text. With no tag it lists " +
      "the recent releases, ranked, with their tags and dates. Read-only.",
    promptSnippet:
      "Read one GitHub release's notes, or list the recent releases",
    promptGuidelines: [
      ...GITHUB_GUIDELINES,
      "A version question is a release question: github-release with no tag says what the newest tags are, and with a tag it says what changed in that one.",
    ],

    executionMode: "parallel",
    parameters: Parameters,

    async execute(_toolCallId, params, signal) {
      return executeGithubRelease(params, signal);
    },
  };
