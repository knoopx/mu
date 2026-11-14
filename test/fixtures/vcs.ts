/**
 * The writes a change stack leaves in the log.
 *
 * A describe answers in a full details shape — the ids it resolved before and
 * after, and the description that landed — and the log paints that, not the
 * aligned text the model reads. The message here is the one a real write left:
 * a subject too long for a header's line, and a body under it.
 */

import { VCS_DESCRIBE_TOOL } from "../../src/plugins/vcs/constants";
import type { VcsDescribeDetails } from "../../src/plugins/vcs/types";
import { toolCallFixture, type ToolFixture } from "./tool";

/** The subject alone runs past a tool header's one-line budget. */
export const DESCRIBE_SUBJECT =
  "fix(ai/FileTree): empty folders show no chevron and take no todo";

/** The body a subject only half-says, kept on its own lines. */
export const DESCRIBE_BODY = [
  "- a folder with nothing in it draws no chevron and takes no click",
  "- the todo count is read off the tree, not off the row under the cursor",
];

const MESSAGE = [DESCRIBE_SUBJECT, "", ...DESCRIBE_BODY].join("\n");

/** The call as the model was answered: a status row of its own, then the message. */
const answerOf = (details: VcsDescribeDetails): string =>
  [
    `commit        change        message  status`,
    `${details.commit}  ${details.change}  ${DESCRIBE_SUBJECT}  ok`,
  ].join("\n");

const CHANGED = "msrwzmxunmvy";
const COMMIT = "8c1f4ba20d7e";

const describeDetails = (
  over: Partial<VcsDescribeDetails> = {},
): VcsDescribeDetails => ({
  commit: COMMIT,
  change: CHANGED,
  previous_commit: "1a7ce90b4f22",
  previous_change: CHANGED,
  message: MESSAGE,
  status: "ok",
  error: "",
  ...over,
});

/** A describe that wrote on the change it was pointed at: no change id moved. */
export const VCS_DESCRIBE_ITEM: ToolFixture = toolCallFixture(
  "call-vcs-describe",
  VCS_DESCRIBE_TOOL,
  { hash: CHANGED, message: MESSAGE },
  "ok",
  answerOf(describeDetails()),
  { details: describeDetails() },
);

/** The same write on the working copy, which mints a new change id — and the row says so. */
export const VCS_DESCRIBE_REWRITTEN_ITEM: ToolFixture = toolCallFixture(
  "call-vcs-describe-rewritten",
  VCS_DESCRIBE_TOOL,
  { hash: "@", message: MESSAGE },
  "ok",
  answerOf(describeDetails({ change: "qkpwunvmsrzt" })),
  {
    details: describeDetails({
      change: "qkpwunvmsrzt",
      previous_change: CHANGED,
    }),
  },
);

/** A describe that answered ok and landed no description at all. */
export const VCS_DESCRIBE_EMPTY_ITEM: ToolFixture = toolCallFixture(
  "call-vcs-describe-empty",
  VCS_DESCRIBE_TOOL,
  { hash: CHANGED, message: " " },
  "ok",
  answerOf(describeDetails({ message: "" })),
  { details: describeDetails({ message: "" }) },
);

/** A describe that never reached the revision it was pointed at. */
export const VCS_DESCRIBE_FAILED_ITEM: ToolFixture = toolCallFixture(
  "call-vcs-describe-failed",
  VCS_DESCRIBE_TOOL,
  { hash: "zzzzzzzz", message: MESSAGE },
  "error",
  `cannot resolve revision zzzzzzzz in /home/knoopx/Projects/gpuix-apps/mu`,
  {
    details: describeDetails({
      commit: "",
      change: "",
      previous_commit: "",
      previous_change: "",
      message: "",
      status: "failed",
      error: "cannot resolve revision zzzzzzzz in /home/knoopx/Projects/gpuix-apps/mu",
    }),
  },
);
