/**
 * The read every other vcs call is pointed at first: the stack, with the ids
 * a later call names. Scope, bookmark and bound are parameters; the columns
 * are a template in lib/ops.ts, so `full` adds fields instead of letting the
 * caller ask for a format flag.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type { PluginTool } from "../../core/lib/plugin/manifest";
import { VCS_LOG_TOOL } from "../constants";
import { failedResult, noRepoResult, type VcsBlank } from "../lib/answer";
import {
  formatParam,
  limitParam,
  offsetParam,
  oldestFirstParam,
} from "../lib/params";
import { jjRoot, runLog } from "../lib/ops";
import {
  blocks,
  statusTable,
  tableOf,
  toolResult,
} from "../../core/lib/agent/toolText";
import type { VcsLogDetails, VcsLogParams } from "../types";

const Parameters = Type.Object({
  rev: Type.Optional(
    Type.String({
      description:
        "Revision scope — a jj change ID, jj commit ID, or revset (e.g. `@`, `@-`). Empty reads the whole log.",
    }),
  ),
  bookmark: Type.Optional(
    Type.String({
      description:
        "Bookmark name — resolves `bookmarks(<name>)`, intersected with `rev` when both are given.",
    }),
  ),
  oldest_first: oldestFirstParam(),
  limit: limitParam("commits"),
  offset: offsetParam("commits"),
  format: formatParam(
    "is change, commit, author, date, description",
    "adds bookmarks, tags, files",
  ),
});

/** No repo and no matching commits are different news, so `unsupported` is answered before the CLI is reached. */
export async function executeVcsLog(
  params: VcsLogParams,
): Promise<AgentToolResult<VcsLogDetails>> {
  const blank: VcsBlank<VcsLogDetails> = {
    vcs: "jj",
    rev: params.rev ?? "",
    commit_count: 0,
    rows: [],
  };

  if (jjRoot() === null) return noRepoResult(blank);

  const found = await runLog({
    rev: params.rev,
    bookmark: params.bookmark,
    limit: params.limit,
    offset: params.offset,
    oldestFirst: params.oldest_first,
    full: params.format === "full",
  });

  if (found.status === "failed") return failedResult(blank, found.error);

  const scope = found.revset.length > 0 ? found.revset : "(all)";
  const full = params.format === "full";
  const text =
    found.rows.length === 0
      ? `no commits match ${scope}`
      : blocks(
          statusTable({ vcs: "jj", rev: scope, status: "ok" }),
          tableOf(
            found.rows.map((row) => ({
              change: row.change,
              commit: row.commit,
              author: row.author,
              date: row.date,
              description: row.description,
              ...(full
                ? {
                    bookmarks: row.bookmarks,
                    tags: row.tags,
                    files: row.files,
                  }
                : {}),
            })),
          ),
        );

  return toolResult(text, {
    ...blank,
    status: found.status,
    commit_count: found.rows.length,
    rows: found.rows,
    error: "",
  });
}

/** Read-only, and the name the user's guardrail rules hand an agent instead of a raw CLI call. */
export const vcsLogTool: PluginTool<typeof Parameters, VcsLogDetails> = {
  name: VCS_LOG_TOOL,
  icon: "list",
  label: "VCS log",
  description:
    "Lists the commits of a jujutsu repo — the change id, commit hash, author, date and " +
    "first description line of each, with bookmarks, tags and touched files in `full` form. " +
    "`rev` is any jj revset, a change ID, a commit ID, or empty for the whole log; `bookmark` " +
    "resolves `bookmarks(<name>)`. The repo root is found by walking up to the first `.jj/` " +
    "marker; a location without one is `unsupported`. Read-only — only `jj log` runs.",
  promptSnippet:
    "List the commits of a jj repo over a revset, bookmark, or the whole log",
  promptGuidelines: [
    "Read VCS state with vcs-log, vcs-file-diff and vcs-file-history — never raw jj or git commands in bash.",
    "Scope with a revset (`ancestors(@, 10)`, `mine()`, `bookmarks(main)`) and bound with `limit`; an unscoped log is the whole repo.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeVcsLog(params);
  },
};
