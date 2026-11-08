/**
 * The hunks of a revision, with the ids a hunk split takes.
 *
 * A hunk id is content-addressed, so a listing is good only until the text
 * moves: this is the call that makes a split possible, and the reason a
 * stale id comes back `empty-selected`. No patch lines — that is vcs-file-diff.
 */

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { VCS_HUNK_LIST_TOOL, VCS_TOOL_LABELS } from "../constants";
import {
  failedResult,
  missingResult,
  noRepoResult,
  unresolvedResult,
  type VcsBlank,
} from "../lib/answer";
import { jjRoot, resolveIds, runHunkList } from "../lib/ops";
import {
  blocks,
  statusTable,
  tableOf,
  toolResult,
} from "../../core/lib/agent/toolText";
import type { VcsHunkListDetails, VcsHunkListParams } from "../types";

const Parameters = Type.Object({
  rev: Type.String({
    description:
      "Revision to list hunks for — a jj change ID, jj commit ID, or revset (e.g. `@`, `@-`).",
  }),
  files: Type.Optional(
    Type.String({
      description:
        'Comma-separated glob patterns limiting which files\' hunks are listed (e.g. "src/**/*.c").',
    }),
  ),
});


/** The revision is resolved even when there are no hunks, so the chips still say what was read. */
export async function executeVcsHunkList(
  params: VcsHunkListParams,
): Promise<AgentToolResult<VcsHunkListDetails>> {
  const rev = params.rev.trim();
  const blank: VcsBlank<VcsHunkListDetails> = {
    rev: "",
    git: "",
    change: "",
    hunk_count: 0,
    rows: [],
  };
  const scope: VcsBlank<VcsHunkListDetails> = { ...blank, rev };

  if (rev.length === 0) return missingResult(blank, "rev");
  if (jjRoot() === null) return noRepoResult(scope);

  const ids = await resolveIds(rev);
  if (ids.git.length === 0) return unresolvedResult(scope, rev);

  // The revision is resolved even when there are no hunks, so the chips still say what was read.
  const read: VcsBlank<VcsHunkListDetails> = {
    ...scope,
    git: ids.git,
    change: ids.change,
  };

  const found = await runHunkList(rev, params.files);
  if (found.status === "failed") return failedResult(read, found.error);

  if (found.rows.length === 0)
    return toolResult(`no hunks for ${rev}`, { ...read, status: "empty", error: "" });

  const text = blocks(
    statusTable({ rev, git: ids.git, change: ids.change, status: "ok" }),
    tableOf(
      found.rows.map((row) => ({
        file: row.file,
        hunk: row.hunk,
        type: row.type,
        before: row.before,
        after: row.after,
      })),
    ),
  );

  return toolResult(text, {
    ...read,
    status: found.status,
    hunk_count: found.rows.length,
    rows: found.rows,
    error: "",
  });
}

/** Read-only, and the only place a `hunk-` id is ever shown. */
export const vcsHunkListTool: ToolDefinition<
  typeof Parameters,
  VcsHunkListDetails
> = {
  name: VCS_HUNK_LIST_TOOL,
  label: VCS_TOOL_LABELS[VCS_HUNK_LIST_TOOL],
  description:
    "Lists the diff hunks of one revision of a jujutsu repo (it wraps the jj-hunk CLI): a " +
    "status row with the RESOLVED commit hash and change id of `rev`, then ONE ROW PER HUNK — " +
    "file, the full content-addressed hunk id (`hunk-` + 64 hex, accepted as-is by " +
    "vcs-hunk-split), type, and the `start-lines` before/after positions. No diff-line content " +
    "is ever returned; vcs-file-diff gives the patch. `files` narrows the listing to " +
    "comma-separated globs. A revision with no matching hunks is `empty`. jj-only: a location " +
    "without a `.jj/` marker is `unsupported`. Read-only — the repo is never mutated.",
  promptSnippet:
    "List a jj revision's hunks with the content-addressed hunk ids a split needs",
  promptGuidelines: [
    "List before you split: vcs-hunk-list returns the `hunk-…` ids, and vcs-hunk-split takes them as `file=hunk-id`.",
    "The hunk id is content-addressed — a hunk whose text changed has a new id, so take ids from a fresh listing.",
    "Read VCS state with vcs-hunk-list and vcs-file-diff — never `jj-hunk list` in bash.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeVcsHunkList(params);
  },
};
