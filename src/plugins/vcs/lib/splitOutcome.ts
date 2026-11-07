/**
 * What a split answers with, once it has run.
 *
 * A split is only believed when both halves re-resolve, so a result names the
 * ids the repo produced and never the ones the caller typed. A rebase happens
 * after that verification and before the report, and a rebase that fails still
 * names the two commits that were created. File split and hunk split differ
 * only in what the CLI was handed and in what their status row carries, so the
 * ceremony — `empty-selected`, verification, rebase, the two tables — lives
 * here and is stated once.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";

import { rebaseAfter, resolveIds } from "./ops";
import { blocks, statusTable, tableOf, toolResult } from "../../core/lib/agent/toolText";
import type {
  RevisionIds,
  SplitOutcome,
  VcsSplitDetails,
  VcsToolStatus,
} from "../types";

/** The pre-state plus this error, and any post-state the CLI already reported. */
export const splitFailure = <D extends VcsSplitDetails>(
  text: string,
  base: D,
  overrides: Partial<D> = {},
): AgentToolResult<D> =>
  toolResult(text, { ...base, status: "failed", error: text, ...overrides });

/** The four fields both halves of a split always fill in. */
const halvesOf = (
  selected: RevisionIds,
  remaining: RevisionIds,
): Pick<
  VcsSplitDetails,
  "selected_git" | "selected_change" | "remaining_git" | "remaining_change"
> => ({
  selected_git: selected.git,
  selected_change: selected.change,
  remaining_git: remaining.git,
  remaining_change: remaining.change,
});

/**
 * The whole tail of a split call: the CLI's own answer, then the re-resolved
 * post-state, then the rebase, then the report. `base` is the verified
 * pre-state; `statusColumns` are this tool's own columns, read between the
 * revision and the status.
 */
export async function reportSplit<D extends VcsSplitDetails>(
  outcome: SplitOutcome,
  base: D,
  insertAfter: string,
  statusColumns: Record<string, string | number> = {},
): Promise<AgentToolResult<D>> {
  if (outcome.status === "failed") return splitFailure(outcome.error, base);

  if (outcome.status === "empty-selected")
    return splitFailure(outcome.error, base, {
      status: "empty-selected" as VcsToolStatus,
      ...halvesOf(outcome.selected, outcome.remaining),
    } as Partial<D>);

  const [selected, first] = await Promise.all([
    resolveIds(outcome.selected.change),
    resolveIds(outcome.remaining.change),
  ]);

  if (selected.git.length === 0 || first.git.length === 0) {
    const text = `post-state verification failed: could not re-resolve the selected (${outcome.selected.change}) or remaining (${outcome.remaining.change}) change after the split`;
    return splitFailure(text, base, {
      ...halvesOf(selected, first),
    } as Partial<D>);
  }

  let remaining = first;
  let rebaseFailure = "";
  if (insertAfter.length > 0) {
    rebaseFailure = await rebaseAfter(remaining.change, insertAfter);
    if (rebaseFailure.length === 0)
      remaining = await resolveIds(remaining.change);
  }

  const halves = halvesOf(selected, remaining);

  if (rebaseFailure.length > 0)
    return toolResult(rebaseFailure, {
      ...base,
      ...halves,
      status: "failed" as VcsToolStatus,
      error: rebaseFailure,
    });

  const text = blocks(
    statusTable({
      rev: base.rev,
      git: base.git,
      change: base.change,
      ...statusColumns,
      status: "ok",
    }),
    tableOf([
      { role: "selected", git: selected.git, change: selected.change },
      { role: "remaining", git: remaining.git, change: remaining.change },
    ]),
    insertAfter.length > 0 ? `remaining placed after ${insertAfter}` : "",
  );

  return toolResult(text, {
    ...base,
    ...halves,
    status: "ok" as VcsToolStatus,
    error: "",
  });
}
