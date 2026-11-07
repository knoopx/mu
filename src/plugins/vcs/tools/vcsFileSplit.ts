/**
 * One change into two, at file granularity.
 *
 * A split is only honest when the selection matched something, so the CLI's
 * own warning becomes `empty-selected` and an empty commit is named as the
 * problem instead of reported as a clean split. Both halves are re-resolved,
 * and `lib/splitOutcome.ts` states that ceremony once for both split tools.
 */

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { VCS_FILE_SPLIT_TOOL, VCS_TOOL_LABELS } from "../constants";
import {
  NOT_A_JJ_REPO,
  jjRoot,
  rebaseAfter,
  relativeToRoot,
  resolveIds,
  runFileSplit,
} from "../lib/ops";
import { missing } from "../lib/toolResult";
import { reportSplit, splitFailure } from "../lib/splitOutcome";
import type { VcsFileSplitDetails, VcsFileSplitParams } from "../types";

const nonEmptyString = (description: string) =>
  Type.String({ minLength: 1, pattern: "^\\s*\\S", description });

const Parameters = Type.Object({
  rev: nonEmptyString(
    "The revision to split — a jj change ID, jj commit ID, or revset (e.g. `@`, `@-`).",
  ),
  files: Type.Array(
    nonEmptyString("A file path or fileset; globs are matched by jj."),
    {
      description:
        "File paths / filesets to extract. Globs pass literally to jj; the named files are the SELECTED files — they go to the first/bottom commit.",
    },
  ),
  message: nonEmptyString(
    "Description for the selected/bottom commit (the one carrying the named files).",
  ),
  insertAfter: Type.Optional(
    Type.String({
      description:
        "Place the remaining/top commit (the files NOT named) after this revision — a jj change ID, jj commit ID, or revset. Runs `jj rebase -r <remaining> --insert-after <insertAfter>`; omitted it stays stacked on the target.",
    }),
  ),
});

const baseOf = (
  params: Partial<VcsFileSplitParams>,
  files: string,
): VcsFileSplitDetails => ({
  rev: params.rev?.trim() ?? "",
  git: "",
  change: "",
  files,
  insert_after: params.insertAfter?.trim() ?? "",
  selected_git: "",
  selected_change: "",
  remaining_git: "",
  remaining_change: "",
  status: "failed",
  error: "",
});

/** Parameters, repo, revision, post-state, in that order: nothing runs against a revset that cannot be resolved. */
export async function executeVcsFileSplit(
  params: VcsFileSplitParams,
): Promise<AgentToolResult<VcsFileSplitDetails>> {
  const rev = params.rev.trim();
  const message = params.message;
  const insertAfter = (params.insertAfter ?? "").trim();

  const files = params.files
    .map((file) => relativeToRoot(file.trim()))
    .filter((file) => file.length > 0);
  const filesLabel = files.join(", ");

  if (rev.length === 0)
    return splitFailure(missing("rev"), baseOf(params, filesLabel));
  if (message.trim().length === 0)
    return splitFailure(missing("message"), baseOf(params, filesLabel));
  if (files.length === 0)
    return splitFailure(
      "no valid file entries (each must be a non-empty file path or fileset)",
      baseOf(params, filesLabel),
    );

  if (jjRoot() === null)
    return splitFailure(NOT_A_JJ_REPO, baseOf(params, filesLabel), {
      status: "unsupported",
    });

  const pre = await resolveIds(rev);
  if (pre.git.length === 0)
    return splitFailure(
      `cannot resolve revision ${rev}`,
      baseOf(params, filesLabel),
    );

  const base = {
    ...baseOf(params, filesLabel),
    git: pre.git,
    change: pre.change,
  };

  return reportSplit(
    await runFileSplit(rev, files, message),
    base,
    insertAfter,
    { files: filesLabel },
  );
}

/** A write — the files are the user's own selection in the panel, the message is the agent's. */
export const vcsFileSplitTool: ToolDefinition<
  typeof Parameters,
  VcsFileSplitDetails
> = {
  name: VCS_FILE_SPLIT_TOOL,
  label: VCS_TOOL_LABELS[VCS_FILE_SPLIT_TOOL],
  description:
    "Splits one revision of a jujutsu repo at FILE granularity: the named `files` (paths or " +
    "filesets — globs are matched by jj) go to the FIRST/bottom commit, which takes the given " +
    "`message`; the remaining files go to a SECOND/top commit that keeps the original " +
    "description. `insertAfter` rebases that remaining/top commit after another revision " +
    "instead of stacking it on the target. The result reports the RESOLVED pre-state of `rev` " +
    "and both halves (selected, remaining) as commit hash and change id. jj-only: no `.jj/` " +
    "marker above the working directory is `unsupported`, and no git command runs. A selection " +
    "matching nothing yields `empty-selected` — an empty commit is never silently created. " +
    "WRITE operation — it mutates the repo, so it runs only when the user explicitly asked for " +
    "this split, never speculatively and never as a rollback.",
  promptSnippet:
    "Split a jj revision, putting the named files in the bottom commit",
  promptGuidelines: [
    "File split is a write: run it only on an explicit request — an instruction from the changes panel, or the user's own words — never speculatively and never as a rollback.",
    'Diff first with vcs-file-diff(path="*"): the `files` array must name files the revision actually changes, or the selection comes back `empty-selected`.',
    "A wrong split is fixed by editing the files back, not by rewriting commits with more VCS writes.",
    "For hunk-level extraction inside one file, list hunks with vcs-hunk-list and split with vcs-hunk-split.",
  ],

  executionMode: "sequential",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeVcsFileSplit(params);
  },
};
