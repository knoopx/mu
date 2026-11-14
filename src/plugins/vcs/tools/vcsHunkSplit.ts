/**
 * One change into two, inside a single file.
 *
 * The target keeps its change id and its place in the stack and holds the
 * selected hunks; the rest move to a new child on top. Entries arrive
 * exactly as vcs-hunk-list reported them and are regrouped per file, and the
 * post-state both halves report is `lib/splitOutcome.ts`.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type { PluginTool } from "../../core/lib/plugin/manifest";
import { VCS_HUNK_SPLIT_TOOL, VCS_TOOL_LABELS } from "../constants";
import { unresolvedResult, type VcsBlank } from "../lib/answer";
import { requiredText } from "../lib/params";
import { hunkEntries, hunkSpec, resolveIds, runHunkSplit } from "../lib/ops";
import { reportSplit, splitGuard } from "../lib/splitOutcome";
import type { VcsHunkSplitParams, VcsSplitDetails } from "../types";

const Parameters = Type.Object({
  rev: requiredText(
    "The revision to split — a jj change ID, jj commit ID, or revset (e.g. `@`, `@-`).",
  ),
  hunks: Type.Array(
    requiredText("One `file=hunk-id` entry, e.g. `src/a.c=hunk-97fb…`."),
    {
      description:
        "Each entry is `file=hunk-id`, where `file` is repo-relative and `hunk-id` is the full content-addressed id (`hunk-` + 64 hex) from vcs-hunk-list. Entries are grouped per file into the split spec.",
    },
  ),
  message: requiredText(
    "Commit message for the extracted-hunks (selected) commit.",
  ),
  insertAfter: Type.Optional(
    Type.String({
      description:
        "Place the new child commit (the unselected `remaining` hunks) after this revision — a jj change ID, jj commit ID, or revset. Runs `jj rebase -r <remaining> --insert-after <insertAfter>`; omitted it is stacked on the target.",
    }),
  ),
});

const baseOf = (
  params: Partial<VcsHunkSplitParams>,
): VcsBlank<VcsSplitDetails> => ({
  rev: params.rev?.trim() ?? "",
  git: "",
  change: "",
  insert_after: params.insertAfter?.trim() ?? "",
  selected_git: "",
  selected_change: "",
  remaining_git: "",
  remaining_change: "",
});

/** Entries are checked before the repo is touched — a malformed spec must not half-run. */
export async function executeVcsHunkSplit(
  params: VcsHunkSplitParams,
): Promise<AgentToolResult<VcsSplitDetails>> {
  const rev = params.rev.trim();
  const message = params.message;
  const insertAfter = (params.insertAfter ?? "").trim();
  const entries = hunkEntries(params.hunks);
  const base = baseOf(params);

  const stopped = splitGuard(
    base,
    rev,
    message,
    entries,
    "no valid hunk entries (each must be file=hunk-id)",
  );
  if (stopped !== null) return stopped;

  const pre = await resolveIds(rev);
  if (pre.git.length === 0) return unresolvedResult(base, rev);

  return reportSplit<VcsSplitDetails>(
    await runHunkSplit(rev, hunkSpec(entries), message),
    { ...base, git: pre.git, change: pre.change },
    insertAfter,
  );
}

/** A write — the hunks came from the user's own split-hunk key on one file row. */
export const vcsHunkSplitTool: PluginTool<typeof Parameters, VcsSplitDetails> =
  {
    name: VCS_HUNK_SPLIT_TOOL,
    icon: "callSplit",
    label: VCS_TOOL_LABELS[VCS_HUNK_SPLIT_TOOL],
    description:
      "Splits one revision of a jujutsu repo at HUNK granularity: the target is rewritten IN " +
      "PLACE — same change id, same position — keeping only the selected hunks and taking the " +
      "given `message`, while the unselected hunks move to a NEW child commit (new change id, " +
      "stacked on top) that keeps the original description. `hunks` are `file=hunk-id` entries " +
      "exactly as vcs-hunk-list returns them (`file` repo-relative, `hunk-id` the full " +
      "`hunk-` + 64 hex id), grouped per file into the spec. `insertAfter` rebases that new " +
      "child after another revision. The result reports the RESOLVED pre-state of `rev` and both " +
      "halves. jj-only: no `.jj/` marker is `unsupported`, and no git command runs. An empty " +
      "`hunks` array fails before the repo is touched. WRITE operation — it mutates the repo, so " +
      "it runs only when the user explicitly asked for this split, never speculatively and never " +
      "as a rollback.",
    promptSnippet:
      "Split a jj revision, keeping the selected hunks in place and moving the rest to a child",
    promptGuidelines: [
      "Hunk split is a write: run it only on an explicit request — an instruction from the changes panel, or the user's own words — never speculatively and never as a rollback.",
      "List first with vcs-hunk-list: the ids are content-addressed, so a stale or renamed hunk id matches nothing and the split comes back `empty-selected`.",
      "A wrong split is fixed by editing the files back, not by rewriting commits with more VCS writes.",
      "To move whole files, use vcs-file-split instead of naming every hunk of a file.",
    ],

    executionMode: "sequential",
    parameters: Parameters,

    async execute(_toolCallId, params) {
      return executeVcsHunkSplit(params);
    },
  };
