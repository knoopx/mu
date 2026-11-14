/**
 * A file as one revision had it.
 *
 * Bytes are not text: control bytes answer `binary` with the body dropped,
 * so neither the log paints a wall of mojibake nor the model is charged
 * for reading it.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type { PluginTool } from "../../core/lib/plugin/manifest";
import { VCS_FILE_HISTORY_SHOW_TOOL } from "../constants";
import {
  failedResult,
  missingResult,
  noRepoResult,
  type VcsBlank,
} from "../lib/answer";
import { jjRoot, resolveIds, runFileShow } from "../lib/ops";
import { blocks, statusTable, toolResult } from "../../core/lib/agent/toolText";
import type { VcsFileShowDetails, VcsFileShowParams } from "../types";

const Parameters = Type.Object({
  path: Type.String({
    description: "File path (absolute, or relative to the working directory).",
  }),
  hash: Type.String({
    description:
      "The revision — a jj change ID, jj commit ID, or revset (e.g. from `vcs-file-history`).",
  }),
});

/** The revision is resolved before the read, so even a failure names the change that was read. */
export async function executeVcsFileHistoryShow(
  params: VcsFileShowParams,
): Promise<AgentToolResult<VcsFileShowDetails>> {
  const path = params.path.trim();
  const hash = params.hash.trim();

  const blank: VcsBlank<VcsFileShowDetails> = {
    hash,
    change: "",
    path,
    lines: 0,
    content: "",
  };

  if (path.length === 0 || hash.length === 0)
    return missingResult(blank, path.length === 0 ? "path" : "hash");

  if (jjRoot() === null) return noRepoResult(blank);

  const ids = await resolveIds(hash);
  const found = await runFileShow(path, hash);

  // A failure still names the change it read, so the chips say what was looked at.
  const read: VcsBlank<VcsFileShowDetails> = {
    ...blank,
    hash: ids.git.length > 0 ? ids.git : hash,
    change: ids.change,
  };

  if (found.status === "failed") return failedResult(read, found.error);

  const details: VcsFileShowDetails = {
    ...read,
    hash: ids.git,
    status: found.status,
    lines: found.lines,
    content: found.body,
    error: "",
  };

  const text = blocks(
    statusTable({
      hash: ids.git,
      change: ids.change,
      path,
      status: found.status,
      lines: found.lines,
    }),
    found.body,
  );

  return toolResult(text, details);
}

/** Read-only; the body it returns is painted as code, never parsed back apart. */
export const vcsFileHistoryShowTool: PluginTool<
  typeof Parameters,
  VcsFileShowDetails
> = {
  name: VCS_FILE_HISTORY_SHOW_TOOL,
  icon: "description",
  label: "VCS file at revision",
  description:
    "Shows a file's content at one revision of a jujutsu repo — `hash` is a jj change ID, jj " +
    "commit ID, or revset, and the result reports the RESOLVED commit hash and change id with " +
    "the path, status and line count, then the file verbatim. A file whose bytes are control " +
    "bytes reports `binary` and its bytes are dropped. jj-only: no `.jj/` marker above the " +
    "working directory is `unsupported`. Read-only: the repo is never mutated.",
  promptSnippet:
    "Read a file's content at a given jj revision, with resolved identities",
  promptGuidelines: [
    "Use vcs-file-history-show instead of `jj show`/`jj read`/`jj cat` to read a file as it was.",
    "Take the revision from vcs-file-history, so the id is one the repo actually has.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeVcsFileHistoryShow(params);
  },
};
