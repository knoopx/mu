import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { answer, ran, usage, userTurn } from "../turn";

const FOLDERS = [
  "adwaita-gpuix/  changes/  channels/  media-viewer/  mermaid/",
  "mu/             notion/   openui-canvas/ pi-swarm/    regex/",
  "specs/          storybook/ strudel/",
].join("\n");

/**
 * The project switch, asked out loud: the folders under one parent, and the
 * panel's answer, which is not a folder scan but mu's own session store — the
 * places somebody has actually worked, newest first, each with the history
 * waiting in it.
 */
export const PROJECT_SWITCH_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-switch",
    "there are a dozen folders under gpuix-apps and I keep losing which one a name lives in. mu knows where I have already worked, right — show me that list, not the disk",
    0,
  ),
  ran(
    "c-folders",
    "bash",
    { command: "ls ~/Projects/gpuix-apps" },
    FOLDERS,
    1_200,
  ),
  {
    ...answer(
      "a-switch",
      [
        "The disk is the worse question: it holds folders you have never opened. The list above the composer is mu's own session store — every folder with a session behind it, newest work first, so `mu` is at the top and `strudel` is where you left it a week ago.",
        "",
        "Each row says the folder, the folder it sits in, how many sessions are waiting there and how long ago you last worked in it. Enter opens a window at the one under the cursor and leaves this conversation holding this folder, because a window _is_ a working directory.",
      ].join("\n"),
      {
        reasoning:
          "The person asked for what mu knows rather than what the disk holds, so the answer names the store the panel reads and what a row says.",
      },
    ),
    usage: usage(7_100, 420, 0, 0, 1),
  },
];
