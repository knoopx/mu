import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { answer, failed, ran, userTurn, usage } from "../turn";

const TIDY_LIST = [
  "figures/",
  "  components/   ChartToolRows.tsx  TreeToolRows.tsx  TableToolRows.tsx",
  "  lib/          plot.ts  structure.ts  answer.ts  toolView.ts  params.ts",
  "  tools/        chartRender.ts  treeRender.ts  tableRender.ts",
  "  constants.ts  types.ts",
].join("\n");

export const FILE_TIDY_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-tidy",
    "there is a file in figures/lib with a name I do not recognise, and half its exports are dead — show me the folder before you touch anything",
    0,
  ),
  ran(
    "c-tree",
    "bash",
    { command: "ls -R src/plugins/figures" },
    TIDY_LIST,
    1_500,
  ),
  ran(
    "c-dead",
    "code-dead-code",
    { scope: "exports", path: "src/plugins/figures" },
    [
      "kind         path                                symbol            line  fix",
      "unused file  src/plugins/figures/lib/params.ts   params.ts         1     mechanical",
      "unused exp.  src/plugins/figures/lib/plot.ts     legacyPointsOf    118   mechanical",
      "unused exp.  src/plugins/figures/lib/plot.ts     CHART_PAD         22    mechanical",
    ].join("\n"),
    4_000,
  ),
  failed(
    "c-rm",
    "bash",
    { command: "rm src/plugins/figures/lib/params.ts" },
    "blocked(guardrails/trash-deletion): Use `trash` or `jj file removal` — a file deleted with rm cannot be recovered [rm -f on command, matched \"rm src/plugins/figures/lib/params.ts\"]",
    6_000,
  ),
  {
    ...answer(
      "a-tidy",
      [
        "`figures/lib/params.ts` is a file nothing imports — its three exports moved into the tool files that read them and the file stayed behind. It is the only deletion candidate; `legacyPointsOf` and `CHART_PAD` are exported and unused but the storybook scene for `Figures/plotted` reads one of them, so check that before removing.",
        "",
        "The rule that stopped `rm` is mine, not yours: files go to the trash or out of the working copy through jj, because a deleted file in a jj working copy is a change you cannot see coming back.",
      ].join("\n"),
      {
        reasoning:
          "The person asked to see before touching, so the answer is a named candidate plus what the check would break. The blocked deletion is part of the screen and worth naming rather than hiding.",
      },
    ),
    usage: usage(9_600, 780, 0, 1, 1),
  },
];
