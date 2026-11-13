import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { answer, ran, userTurn, usage } from "../turn";

const ACCENT_GREP = [
  "src/plugins/core/lib/ui/theme.ts:96: export function accentOf(t: AdwaitaTheme) {",
  "src/plugins/core/lib/ui/theme.ts:97:   return t.color.accent;",
  "src/plugins/core/hooks/useAccentPanel.ts:31: swatch: t.color.accent,",
  "src/plugins/core/hooks/useAccentPanel.ts:32: // every swatch in the list came back the same colour",
  "src/plugins/core/lib/theme/accents.ts:4: export const ACCENTS = [",
].join("\n");

export const ACCENT_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-accent-swatch",
    "the accent picker is useless — nine rows, and the swatch on every one of them is the colour I already have",
    0,
  ),
  ran(
    "c-grep-accent",
    "grep",
    { pattern: "t.color.accent", path: "src/plugins/core" },
    ACCENT_GREP,
    2_500,
  ),
  ran(
    "c-read-accents",
    "read",
    { path: "src/plugins/core/lib/theme/accents.ts", limit: 24 },
    [
      "export const ACCENTS = [",
      '  { key: "blue", label: "Blue", hex: "#3584e4" },',
      '  { key: "teal", label: "Teal", hex: "#2190a4" },',
      '  { key: "orange", label: "Orange", hex: "#ed5b00" },',
      "  // …",
      "];",
      "",
      "/** The row's own colour, never the theme's current accent. */",
      "export function swatchOf(accent: AccentDef, t: AdwaitaTheme): string {",
      '  return t.variant === "dark" ? lighten(accent.hex) : accent.hex;',
      "}",
    ].join("\n"),
    6_000,
  ),
  ran(
    "c-edit-panel",
    "edit",
    {
      path: "src/plugins/core/hooks/useAccentPanel.ts",
      edits: [
        {
          oldText: "swatch: t.color.accent,",
          newText: "swatch: swatchOf(row.accent, t),",
        },
      ],
    },
    "Successfully replaced 1 block(s) in src/plugins/core/hooks/useAccentPanel.ts.",
    9_500,
  ),
  {
    ...answer(
      "a-accent-swatch",
      [
        "The panel was drawing the *current* accent on every row, so the list could only ever show one colour — and the row you were about to pick was indistinguishable from the row you had. Each row now paints its own accent, lightened in the dark themes where a saturated hex sits too close to the card.",
        "",
        "The cursor still marks which one is active, so the state and the choice are two different marks on the row instead of one colour doing both jobs badly.",
      ].join("\n"),
      {
        reasoning:
          "A picker that renders its own current value on every row is not a preview of the choice, it is a mirror. The fix is the row's own value, with the theme's variant deciding how that value sits on the card behind it.",
      },
    ),
    usage: usage(11_400, 1_890, 0, 1, 3),
  },
];
