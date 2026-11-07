/**
 * The write behind the changes panel's describe key.
 *
 * The message is the agent's own, written after it read the diff; this tool
 * only puts it on a revision. The post-state is re-resolved because
 * rewriting the working copy mints a new change id, and the log shows both.
 */

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { VCS_DESCRIBE_TOOL } from "../constants";
import {
  NOT_A_JJ_REPO,
  jjRoot,
  resolveIdentity,
  runDescribe,
} from "../lib/ops";
import { blocks, tableOf, toolResult } from "../../core/lib/agent/toolText";
import type { VcsDescribeDetails, VcsDescribeParams } from "../types";

const Parameters = Type.Object({
  hash: Type.String({
    description: "The revision — a jj change ID, jj commit ID, or revset.",
  }),
  message: Type.String({
    description: "The new description message (may be multiline).",
  }),
});

const blank = (
  status: VcsDescribeDetails["status"],
  error: string,
  previous: { commit: string; change: string } = { commit: "", change: "" },
  post: { commit: string; change: string; message: string } = {
    commit: "",
    change: "",
    message: "",
  },
): VcsDescribeDetails => ({
  commit: post.commit,
  change: post.change,
  previous_commit: previous.commit,
  previous_change: previous.change,
  message: post.message,
  status,
  error,
});

/** Resolved before and after: a write that cannot name what it changed has not proved it ran. */
export async function executeVcsDescribe(
  params: VcsDescribeParams,
): Promise<AgentToolResult<VcsDescribeDetails>> {
  const hash = params.hash.trim();
  const message = params.message;

  if (hash.length === 0)
    return toolResult(
      "missing required parameter: hash",
      blank("failed", "missing required parameter: hash"),
    );
  if (message.trim().length === 0)
    return toolResult(
      "missing required parameter: message",
      blank(
        "failed",
        "missing required parameter: message",
        { commit: "", change: "" },
        { commit: "", change: "", message: "" },
      ),
    );

  const root = jjRoot();
  if (root === null)
    return toolResult(NOT_A_JJ_REPO, blank("unsupported", NOT_A_JJ_REPO));

  const previous = await resolveIdentity(hash);
  if (previous.change.length === 0) {
    const reason = `cannot resolve revision ${hash} in ${root}`;
    return toolResult(reason, blank("failed", reason));
  }

  const write = await runDescribe(hash, message);
  if (write.error.length > 0)
    return toolResult(
      write.error,
      blank(
        "failed",
        write.error,
        { commit: previous.git, change: previous.change },
        { commit: "", change: "", message: "" },
      ),
    );

  const post = await resolveIdentity(hash);
  const identities =
    post.git.length > 0 ? post : await resolveIdentity(previous.change);

  const details = blank(
    "ok",
    "",
    { commit: previous.git, change: previous.change },
    {
      commit: identities.git,
      change: identities.change,
      message: identities.description,
    },
  );

  const text = blocks(
    tableOf([
      {
        commit: details.commit,
        change: details.change,
        message: identities.description,
        status: "ok",
      },
    ]),
    details.change !== details.previous_change
      ? `working copy rewritten: ${details.previous_change} → ${details.change}`
      : "",
  );

  return toolResult(text, details);
}

/** A write — it runs on an instruction the user asked for, never speculatively and never as an undo. */
export const vcsDescribeTool: ToolDefinition<
  typeof Parameters,
  VcsDescribeDetails
> = {
  name: VCS_DESCRIBE_TOOL,
  label: "VCS describe",
  description:
    "Sets the description message of a revision in a jujutsu repo — a jj change ID, jj commit " +
    "ID, or revset — and reports the post-state: the resolved commit hash, change id and the " +
    "new first line, with the PREVIOUS identities alongside, so a working-copy rewrite (which " +
    "mints a new change id) stays visible. jj-only: a location without a `.jj/` marker is " +
    "`unsupported`, and no git command runs. WRITE operation — it mutates the repo, so it runs " +
    "only when the user explicitly asked for this description, never speculatively and never " +
    "as a rollback.",
  promptSnippet:
    "Set a revision's description message, reporting the before and after identities",
  promptGuidelines: [
    "Describe is a write: run it on an explicit request — an instruction from the changes panel, or the user's own words — and read the diff first so the message says what the change does.",
    "It is not a rollback mechanism. Undoing a wrong change means editing the files back, not rewriting commits.",
  ],

  executionMode: "sequential",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeVcsDescribe(params);
  },
};
