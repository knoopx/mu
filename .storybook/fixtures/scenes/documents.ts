import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { answer, ran, usage, userTurn } from "../turn";

const PANEL_ROWS_DOC = [
  "## What a panel owns",
  "",
  "A panel is a band above the composer with one column of ink. It pads itself by one unit on all four sides, and everything it says stands one measure further in — so the ink sits at twice the band's breathing from the left **and** the right, and one measure from the top and bottom.",
  "",
  "| panel | what it costs the height | what it draws |",
  "| --- | --- | --- |",
  "| commands | 6 rows + hints | one row per command |",
  "| files | 8 rows + preview | name, and the file under the cursor |",
  "| changes | 10 rows + patch | the stack, its files, the diff |",
  "| tree | 12 rows | the conversation, one row per point |",
  "| terminal | the whole slot | the shell's own grid |",
  "",
  "```ts",
  "export function panelChromeHeight(t: AdwaitaTheme, slots: PanelSlots): number {",
  "  return (",
  "    panelPad(t) * 2 +",
  "    slots.rows * ROW_HEIGHT +",
  "    (slots.hints ? ROW_HEIGHT : 0)",
  "  );",
  "}",
  "```",
  "",
  "A padding moved in `chrome.ts` therefore moves a row budget with it — that is the whole reason there is one number.",
].join("\n");

export const DOCUMENT_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-panel-doc",
    "write the panel layout rules down where the next person will actually read them, with the numbers, not the vibes",
    0,
  ),
  ran(
    "c-read-chrome",
    "read",
    { path: "src/plugins/core/lib/composer/chrome.ts", offset: 1, limit: 48 },
    [
      "export function panelPad(t: AdwaitaTheme): number {",
      "  return t.space.sm;",
      "}",
      "",
      "/** The band: one unit of breathing on all four sides. */",
      "export function panelBox(t: AdwaitaTheme, tone: PanelTone): StyleDesc {",
      "  return {",
      "    backgroundColor: panelFill(t, tone),",
      "    paddingTop: panelPad(t),",
      "    paddingBottom: panelPad(t),",
      "    paddingLeft: panelPad(t),",
      "    paddingRight: panelPad(t),",
      "  };",
      "}",
    ].join("\n"),
    4_000,
  ),
  ran(
    "c-write-doc",
    "write",
    { path: "docs/panels.md", content: PANEL_ROWS_DOC },
    "Successfully wrote to docs/panels.md",
    9_000,
  ),
  {
    ...answer(
      "a-panel-doc",
      "Written to `docs/panels.md`, next to the code it describes, with the table of what each panel costs the slot. The one fact worth arguing with is the 1x2 ratio: an equal band top-to-bottom and left-to-right is why a second padding number in a panel is a bug and not a taste.",
    ),
    usage: usage(17_300, 3_120, 0, 1, 3),
  },
  userTurn(
    "u-stop",
    "now do the same for the transcript grid, the gutter marks, and every column a figure can st—",
    14,
  ),
  {
    ...answer(
      "a-stopped",
      "The transcript is a two-column grid: text of every row starts at the page inset, and every mark hangs to its left, because the tool header puts its glyph there and nothing else gets to pick a second column. Figures that trail a row stand in columns the list reserves — a meter fills from its column's start, a count reads against its end — so a long path never shoves a number onto a second line. The row list measures across all its sections, which is why a meter under a `high` is not",
      { streaming: false, stopReason: "aborted" },
    ),
    usage: usage(12_800, 2_410, 0, 15, 16),
  },
];
