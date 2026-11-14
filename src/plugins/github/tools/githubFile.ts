/**
 * `github-file` — one file's text at one ref.
 *
 * The contents endpoint answers with base64 up to a megabyte and gives up above
 * it, so a big file comes off the raw host instead. Bytes that are not text are
 * reported as `binary` rather than shown as noise.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type { PluginTool } from "../../core/lib/plugin/manifest";
import { GITHUB_FILE_TOOL, GITHUB_TOOL_LABELS } from "../constants";
import { readFile } from "../lib/api/read/file";
import {
  ownerParam,
  pathParam,
  refreshParam,
  refParam,
  repoParam,
} from "../lib/params";
import { runRead } from "../lib/reader";
import type { GithubCall, GithubFileParams } from "../types";
import { FILE_OR_FOLDER, GITHUB_GUIDELINES } from "./guidelines";

const Parameters = Type.Object({
  owner: ownerParam(),
  repo: repoParam(),
  path: pathParam("file"),
  ref: refParam(),
  refresh: refreshParam(),
});

async function executeGithubFile(
  params: GithubFileParams,
  signal?: AbortSignal,
): Promise<AgentToolResult<GithubCall>> {
  return runRead(readFile, { ...params, signal });
}

export const githubFileTool: PluginTool<typeof Parameters, GithubCall> = {
  name: GITHUB_FILE_TOOL,
  icon: "description",
  label: GITHUB_TOOL_LABELS[GITHUB_FILE_TOOL],
  description:
    "Reads one file from a GitHub repository at a ref — its text after a metadata table " +
    "of name, path, ref, size and sha. A file too large for the contents API is read from " +
    "the raw file host; bytes that are not text answer `binary` rather than as characters. " +
    "The text is capped and the answer says how much fell off. Read-only.",
  promptSnippet: "Read a file's text out of a GitHub repository at a ref",
  promptGuidelines: [
    ...GITHUB_GUIDELINES,
    FILE_OR_FOLDER,
    "A remote file read this way is not a local one: it cannot be edited, and its path is inside the other project.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params, signal) {
    return executeGithubFile(params, signal);
  },
};
