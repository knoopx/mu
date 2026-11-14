import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { photoFile, photoOf } from "../media";
import { answer, failed, ran, running, usage, userTurn } from "../turn";

const HEIGHT_ROWS = [
  "1x  slot 216px  rows 6   ok",
  "2x  slot 216px  rows 3   the hint bar paints over the last row",
  "2x  slot 432px  rows 6   ok",
].join("\n");

const PANEL_PATCH = [
  "--- a/src/plugins/core/lib/composer/panelHeight.ts",
  "+++ b/src/plugins/core/lib/composer/panelHeight.ts",
  "@@ -18,7 +18,9 @@",
  " export function composerPanelRowsForHeight(",
  "   t: AdwaitaTheme,",
  "   height: number,",
  " ): number {",
  "-  return Math.floor((height - panelPad) / ROW_HEIGHT);",
  "+  const chrome = panelChromeHeight(t, { rows: 0, hints: true });",
  "+  return Math.floor((height - chrome) / ROW_HEIGHT);",
  " }",
].join("\n");

const PANEL_DIFF = [
  "-  return Math.floor((height - panelPad) / ROW_HEIGHT);",
  "+  const chrome = panelChromeHeight(t, { rows: 0, hints: true });",
  "+  return Math.floor((height - chrome) / ROW_HEIGHT);",
].join("\n");
export const AGENT_JOB_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-two-x",
    "on the 2x display every panel is one row short and the hint bar paints over the row underneath it. find out what the height maths is actually charging for, then fix it everywhere at once",
    0,
  ),
  ran(
    "c-screen",
    "bash",
    { command: "bun run scratch/panel-rows.ts" },
    HEIGHT_ROWS,
    2_000,
  ),
  ran(
    "c-read-height",
    "read",
    {
      path: "src/plugins/core/lib/composer/panelHeight.ts",
      offset: 1,
      limit: 30,
    },
    [
      "export function composerPanelRowsForHeight(",
      "  t: AdwaitaTheme,",
      "  height: number,",
      "): number {",
      "  return Math.floor((height - panelPad) / ROW_HEIGHT);",
      "}",
    ].join("\n"),
    6_000,
  ),
  failed(
    "c-typecheck-fail",
    "bash",
    { command: "bun run typecheck" },
    [
      "src/plugins/core/lib/composer/panelHeight.ts:22:42 - error TS2554: Expected 1 arguments, but got 0.",
      "",
      "  22 |   const chrome = panelChromeHeight();",
      "     |                                          ^",
      "",
      "Found 1 error in src/plugins/core/lib/composer/panelHeight.ts:22",
    ].join("\n"),
    11_000,
  ),
  ran(
    "c-grep-pad",
    "grep",
    { pattern: "panelPad", path: "src/plugins/core" },
    [
      "src/plugins/core/lib/composer/chrome.ts:14: export const panelPad = t.space.sm;",
      "src/plugins/core/lib/composer/panelHeight.ts:22: const chrome = panelChromeHeight(t, { rows: 0, hints: true });",
      "src/plugins/core/components/composer/panels.tsx:96: const rows = composerPanelRowsForHeight(t, slotHeight);",
    ].join("\n"),
    15_000,
  ),
  ran(
    "c-read-shot",
    "read",
    { path: photoOf("stars").path },
    "Read image file [image/jpeg]",
    18_000,
    { image: photoFile("stars") },
  ),
  ran(
    "c-edit-height",
    "edit",
    {
      path: "src/plugins/core/lib/composer/panelHeight.ts",
      edits: [
        {
          oldText: "  return Math.floor((height - panelPad) / ROW_HEIGHT);",
          newText:
            "  const chrome = panelChromeHeight(t, { rows: 0, hints: true });\n  return Math.floor((height - chrome) / ROW_HEIGHT);",
        },
      ],
    },
    "Successfully replaced 1 block(s) in src/plugins/core/lib/composer/panelHeight.ts.",
    22_000,
    {
      details: { patch: PANEL_PATCH, diff: PANEL_DIFF, firstChangedLine: 22 },
    },
  ),
  // Open, arguments still arriving: the row paints the file as far as it is written.
  running("c-write-screens", "write", {
    path: "src/plugins/core/lib/composer/panelChrome.ts",
    content: [
      "export function panelChromeHeight(",
      "  t: AdwaitaTheme,",
      "  slots: { rows: number; hints: boolean },",
      "): number {",
      "  return (",
      "    panelPad(t) * 2 +",
      '    lineBox(t, "row").height * slots.rows +',
      "    (slots.hints ? ROW_HEIGHT : 0)",
      "  );",
      "}",
    ].join("\n"),
  }),
  ran(
    "c-capture",
    "bash",
    { command: "bun storybook ." },
    [
      "  ✓ stories/AgentActions/work.png (215 969 bytes)",
      "  ✓ stories/Changes/instructed.png (252 771 bytes)",
      "  ✓ stories/Changes/panel.png (261 985 bytes)",
      "  ✓ stories/Chat/session.png (239 903 bytes)",
      "  ✓ stories/CodeQuality/surveyed.png (230 447 bytes)",
      "  ✓ stories/Composer/drafting.png (244 646 bytes)",
      "  ✓ stories/Guardrails/tended.png (164 750 bytes)",
      "  ✓ stories/Guardrails/triggered.png (122 893 bytes)",
      "  ✓ stories/History/tree.png (264 120 bytes)",
      "  ✓ stories/Looks/accents.png (219 807 bytes)",
      "  ✓ stories/Looks/dark.png (270 573 bytes)",
      "  ✓ stories/Looks/light.png (271 435 bytes)",
      "  ✓ stories/Looks/nightsky.png (269 297 bytes)",
      "  ✓ stories/Models/model.png (277 725 bytes)",
      "  ✓ stories/Models/thinking.png (242 628 bytes)",
      "  ✓ stories/Paths/completing.png (266 727 bytes)",
      "  ✓ stories/ProjectHeader/opens.png (171 500 bytes)",
      "  ✓ stories/Questions/asked.png (131 076 bytes)",
      "  ✓ stories/Sessions/list.png (277 109 bytes)",
      "  ✓ stories/WebSearch/results.png (280 644 bytes)",
      "",
      "20 ok, 0 failed → ~/Projects/gpuix-apps/mu",
      "wrote 20 PNGs in 41.6s",
      "largest: Models/model.png 277 725 bytes — the model list is a lot of text",
      "smallest: Questions/asked.png 131 076 bytes — a short log and one question panel",
      "total: 4 674 000 bytes across 20 scenes",
    ].join("\n"),
    27_000,
  ),
  ran(
    "c-typecheck-ok",
    "bash",
    { command: "bun run typecheck" },
    "tsc --noEmit\nno errors",
    33_000,
  ),
  {
    ...answer(
      "a-two-x",
      "The maths was charging one pad for a band that pads four times, and at 2x the missing unit is a whole row — which is why the hint bar landed on top of the last row instead of below it. Every panel now asks the same function what its chrome costs, so a padding moved in `chrome.ts` moves the row budget with it, and the twelve panels in the table went from 3–7 rows to 6–14 without any of them naming a number.",
      {
        reasoning:
          "The symptom was per-panel, the cause was shared: twelve call sites each subtracting their own idea of chrome. Fixing the arithmetic in one place is what makes the next panel correct for free, and the row budget had to come from the same constants as the paint or the two would drift again.",
      },
    ),
    usage: usage(21_400, 2_960, 0, 1, 8),
  },
];
