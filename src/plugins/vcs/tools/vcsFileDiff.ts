/**
 * The patch, with both of its ends resolved.
 *
 * A caller may name a revset and still get its answer in change ids, so a
 * description written after the read can be checked against the change that
 * was actually read. `path="*"` is the tree; one path is one section of it.
 */

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { VCS_FILE_DIFF_TOOL } from "../constants";
import {
  NOT_A_JJ_REPO,
  jjRoot,
  parentRev,
  resolveIds,
  runDiff,
} from "../lib/ops";
import { blocks, statusTable, toolResult } from "../lib/toolResult";
import type { VcsFileDiffDetails, VcsFileDiffParams } from "../types";

const Parameters = Type.Object({
  path: Type.String({
    description:
      "File path (absolute, or relative to the working directory), or `*` / empty to diff the whole tree.",
  }),
  from: Type.String({
    description:
      "Revision to diff from — a jj change ID, jj commit ID, or revset.",
  }),
  to: Type.Optional(
    Type.String({
      description:
        'Second revision. Omit or pass "" to diff against the parent of `from`.',
    }),
  ),
});

/** A failure still answers in the full details shape — the log paints a row for it either way. */
const empty = (
  status: VcsFileDiffDetails["status"],
  error: string,
  params: Partial<VcsFileDiffParams> = {},
): VcsFileDiffDetails => ({
  from: params.from ?? "",
  to: params.to ?? "",
  path: params.path ?? "",
  from_git: "",
  from_change: "",
  to_git: "",
  to_change: "",
  status,
  diff_line_count: 0,
  diff: "",
  error,
});

/** An omitted `to` is the parent of `from`, resolved first so the second end is an identity and not a guess. */
export async function executeVcsFileDiff(
  params: VcsFileDiffParams,
): Promise<AgentToolResult<VcsFileDiffDetails>> {
  const from = params.from.trim();
  const to = (params.to ?? "").trim();
  const path = params.path.trim();

  if (from.length === 0)
    return toolResult(
      "missing required parameter: from",
      empty("failed", "missing required parameter: from", params),
    );

  if (jjRoot() === null)
    return toolResult(
      NOT_A_JJ_REPO,
      empty("unsupported", NOT_A_JJ_REPO, params),
    );

  const target = to.length === 0 ? await parentRev(from) : to;
  const [fromIds, toIds] = await Promise.all([
    resolveIds(from),
    target.length === 0
      ? Promise.resolve({ git: "", change: "" })
      : resolveIds(target),
  ]);

  const found = await runDiff(path, from, to);
  const identities = {
    from,
    to,
    path,
    from_git: fromIds.git,
    from_change: fromIds.change,
    to_git: toIds.git,
    to_change: toIds.change,
  };

  if (found.status === "failed")
    return toolResult(found.error, {
      ...identities,
      status: "failed",
      diff_line_count: 0,
      diff: "",
      error: found.error,
    });

  const label = path.length === 0 || path === "*" ? "*" : path;
  const toLabel = to.length === 0 ? "working copy" : to;
  const text =
    found.status === "empty"
      ? `no changes for ${label} between ${from} and ${toLabel}`
      : blocks(
          statusTable({
            from_git: fromIds.git,
            from_change: fromIds.change,
            to_git: toIds.git,
            to_change: toIds.change,
            path: label,
            status: "ok",
          }),
          found.body,
        );

  return toolResult(text, {
    ...identities,
    status: found.status,
    diff_line_count: found.lines,
    diff: found.body,
    error: "",
  });
}

/** Read-only, and the only vcs answer that carries a patch the transcript draws as a diff. */
export const vcsFileDiffTool: ToolDefinition<
  typeof Parameters,
  VcsFileDiffDetails
> = {
  name: VCS_FILE_DIFF_TOOL,
  label: "VCS diff",
  description:
    'Shows the unified diff of one file, or of the whole tree (`path="*"`), between two ' +
    "revisions of a jujutsu repo — `from` and `to`, each a jj change ID, jj commit ID, or " +
    "revset; an omitted `to` diffs against the parent of `from`. The result reports both ends " +
    "as RESOLVED identities (short commit hash and short jj change id), not the strings you " +
    "supplied, then the raw diff. jj-only: no `.jj/` marker above the working directory is " +
    "`unsupported`, and no git command is ever run. Read-only — the repo is never mutated.",
  promptSnippet:
    "Diff a file, or the tree, between two jj revisions, with both ends resolved",
  promptGuidelines: [
    "Read VCS state with vcs-file-diff, vcs-log and vcs-file-history — never `jj show -p`, `jj status -v` or git in bash.",
    "Diff before you write: the patch of a revision tells you what a change does, which is what a description has to say.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeVcsFileDiff(params);
  },
};
