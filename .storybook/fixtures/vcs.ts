import {
  VCS_DESCRIBE_TOOL,
  VCS_FILE_DIFF_TOOL,
  VCS_FILE_SPLIT_TOOL,
} from "../../src/plugins/vcs/constants";
import {
  blocks,
  statusTable,
  tableOf,
} from "../../src/plugins/vcs/lib/toolResult";
import type {
  VcsDescribeDetails,
  VcsFileDiffDetails,
  VcsFileSplitDetails,
} from "../../src/plugins/vcs/types";
import { toolCallFixture, type ToolFixture } from "./tool";

export const CHANGES_TARGET = "6d1c4b0a9f21";
export const CHANGES_TARGET_SHORT = "6d1c4b0a";

const COMMIT = "9f3ab21c4d77";
const COMMIT_SHORT = "9f3ab21c";
const SELECTED = "1c7f9a44b2e8";
const SELECTED_SHORT = "1c7f9a44";
const REMAINING = "8b2d63e0a1c5";
const REMAINING_SHORT = "8b2d63e0";

// A split makes two new changes, each with its own commit id; the commit a
// change ends on is never the change id, so the row's two lines differ.
const SELECTED_GIT = "3fa81c6d0b42";
const SELECTED_GIT_SHORT = "3fa81c6d";
const REMAINING_GIT = "c07d5e94ab13";
const REMAINING_GIT_SHORT = "c07d5e94";

const FILE_ROW = "stories/Changes/panel.png";

export const CHANGES_SUBJECT =
  "feat(changes): send describe and split to the agent";

const PATCH = [
  "diff --git a/src/plugins/core/hooks/useChatComposer.ts b/src/plugins/core/hooks/useChatComposer.ts",
  "index 8ef45f361..e6d1e4e7b 100644",
  "--- a/src/plugins/core/hooks/useChatComposer.ts",
  "+++ b/src/plugins/core/hooks/useChatComposer.ts",
  "@@ -158,6 +158,12 @@",
  "+  const sendInstruction = (text: string): void => {",
  "+    if (text.trim().length === 0) return;",
  "+    setFollowTail(true);",
  "+    chat.send(text);",
  "+  };",
].join("\n");

const DIFF_DETAILS: VcsFileDiffDetails = {
  from: CHANGES_TARGET_SHORT,
  to: "",
  path: "*",
  from_git: COMMIT_SHORT,
  from_change: CHANGES_TARGET_SHORT,
  to_git: "",
  to_change: "",
  status: "ok",
  diff_line_count: 10,
  diff: PATCH,
  error: "",
};

const DESCRIBE_DETAILS: VcsDescribeDetails = {
  commit: COMMIT_SHORT,
  change: CHANGES_TARGET_SHORT,
  previous_commit: COMMIT_SHORT,
  previous_change: CHANGES_TARGET_SHORT,
  message: CHANGES_SUBJECT,
  status: "ok",
  error: "",
};

const SPLIT_DETAILS: VcsFileSplitDetails = {
  rev: CHANGES_TARGET_SHORT,
  git: COMMIT_SHORT,
  change: CHANGES_TARGET_SHORT,
  selected_git: SELECTED_GIT_SHORT,
  selected_change: SELECTED_SHORT,
  remaining_git: REMAINING_GIT_SHORT,
  remaining_change: REMAINING_SHORT,
  insert_after: "",
  status: "ok",
  error: "",
  files: FILE_ROW,
};

export const VCS_DIFF_ITEM: ToolFixture = toolCallFixture(
  "call-vcs-diff",
  VCS_FILE_DIFF_TOOL,
  { path: "*", from: CHANGES_TARGET_SHORT },
  "ok",
  blocks(
    statusTable({
      from_git: DIFF_DETAILS.from_git,
      from_change: DIFF_DETAILS.from_change,
      to_git: "",
      to_change: "",
      path: "*",
      status: "ok",
    }),
    PATCH,
  ),
  { details: DIFF_DETAILS },
);

export const VCS_DESCRIBE_ITEM: ToolFixture = toolCallFixture(
  "call-vcs-describe",
  VCS_DESCRIBE_TOOL,
  { hash: CHANGES_TARGET_SHORT, message: CHANGES_SUBJECT },
  "ok",
  blocks(
    tableOf([
      {
        commit: COMMIT_SHORT,
        change: CHANGES_TARGET_SHORT,
        message: CHANGES_SUBJECT,
        status: "ok",
      },
    ]),
  ),
  { details: DESCRIBE_DETAILS },
);

export const VCS_SPLIT_ITEM: ToolFixture = toolCallFixture(
  "call-vcs-split",
  VCS_FILE_SPLIT_TOOL,
  {
    rev: CHANGES_TARGET_SHORT,
    files: [FILE_ROW],
    message: "test(changes): add the scene where the panel asks",
  },
  "ok",
  blocks(
    statusTable({
      rev: CHANGES_TARGET_SHORT,
      git: COMMIT_SHORT,
      change: CHANGES_TARGET_SHORT,
      files: FILE_ROW,
      status: "ok",
    }),
    tableOf([
      { role: "selected", git: SELECTED_GIT_SHORT, change: SELECTED_SHORT },
      { role: "remaining", git: REMAINING_GIT_SHORT, change: REMAINING_SHORT },
    ]),
  ),
  { details: SPLIT_DETAILS },
);

export const CHANGES_SPLIT_FILE = FILE_ROW;
