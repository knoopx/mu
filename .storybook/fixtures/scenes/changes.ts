import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import {
  describeInstruction,
  splitFilesInstruction,
} from "../../../src/plugins/vcs/lib/instructions";
import { CHANGES_ANSWER } from "../prose";
import {
  CHANGES_SPLIT_FILE,
  CHANGES_SUBJECT,
  CHANGES_TARGET,
  CHANGES_TARGET_SHORT,
  VCS_DESCRIBE_ITEM,
  VCS_DIFF_ITEM,
  VCS_SPLIT_ITEM,
} from "../vcs";
import { answer, usage, userTurn } from "../turn";

export const CHANGES_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-changes-describe",
    describeInstruction([CHANGES_TARGET], [""]),
    0,
  ),
  VCS_DIFF_ITEM,
  VCS_DESCRIBE_ITEM,
  userTurn(
    "u-changes-split",
    splitFilesInstruction(CHANGES_TARGET, CHANGES_SUBJECT, [
      CHANGES_SPLIT_FILE,
    ]),
    2,
  ),
  VCS_SPLIT_ITEM,
  {
    ...answer("a-changes", CHANGES_ANSWER),
    usage: usage(9_400, 1_240, 0, 0, 4),
  },
];

export { CHANGES_TARGET_SHORT };
