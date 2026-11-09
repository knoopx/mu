import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { answer, ran, running, usage, userTurn } from "../turn";

export const COMPOSER_DRAFT_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-ring",
    "the ring around the composer is supposed to warn me before the conversation is full, but it stays invisible until it is basically red. and while the draft is empty the pills in that same row are what tell me which model I am on — the ring and the pills are fighting over one line",
    0,
  ),
  ran(
    "c-read-ring",
    "read",
    {
      path: "src/plugins/core/components/composer/Composer.tsx",
      offset: 208,
      limit: 34,
    },
    [
      "function contextRing(t: AdwaitaTheme, used: number, total: number): StyleDesc {",
      "  const percent = total > 0 ? used / total : 0;",
      "  const tone =",
      "    percent >= 0.95",
      '      ? "danger"',
      '      : percent >= 0.85',
      '        ? "warning"',
      '        : "accent";',
      "  return {",
      "    ringColor: t.color[tone].default,",
      "    ringWidth: HAIRLINE,",
      "  };",
      "}",
    ].join("\n"),
    4_000,
  ),
  ran(
    "c-grep-pills",
    "grep",
    { pattern: "contextUsed", path: "src/plugins/core" },
    [
      "src/plugins/core/components/composer/Composer.tsx:188: {draft.length === 0 && <",
      "src/plugins/core/components/composer/pills.tsx:26: label={`${modelShort} · ${thinking}`},",
      "src/plugins/core/components/composer/pills.tsx:41: label={`context ${percent}%`},",
      "src/plugins/core/lib/agent/turnStats.ts:71: export function contextUsedOf(items: readonly TranscriptItem[]): number {",
    ].join("\n"),
    9_000,
  ),
  ran(
    "c-edit-ring",
    "edit",
    {
      path: "src/plugins/core/components/composer/Composer.tsx",
      edits: [
        {
          oldText: "    ringWidth: HAIRLINE,",
          newText:
            "    ringWidth: percent >= 0.85 ? HAIRLINE * 2 : HAIRLINE,\n    ringTrack: t.color.divider.default,",
        },
      ],
    },
    "Successfully replaced 1 block(s) in src/plugins/core/components/composer/Composer.tsx.",
    14_000,
  ),
  running("c-edit-pills", "edit", {
    path: "src/plugins/core/components/composer/pills.tsx",
    edits: [
      {
        oldText: "export function composerPills(props: ComposerPillsProps)",
        newText:
          "export function composerPills(props: ComposerPillsProps): JSX.Element | null",
      },
    ],
  }),
  {
    ...answer(
      "a-ring",
      [
        "The ring now has a track, so it is a *measure* rather than a light that only turns on at the end: the whole border is drawn in `divider.default` and the filled arc runs accent → orange → red as the conversation grows. Before this it was one hairline of accent ink on a window-coloured border, which is to say invisible until it was urgent.",
        "",
        "The pills stay exactly where they are — model, thinking level, and context percent, on the row, and they step out the moment you start typing, because then the question is asked and the row is yours.",
      ].join("\n"),
      {
        reasoning:
          "A warning that only appears when the thing it warns about is nearly here is not a warning. The fix was to give the ring something to be measured against, which is the same reason a meter in the log paints its track in `divider.default` — a bar with no track reads as a dash of no particular length. The pills are a different job: they name the current setting, they do not forecast one.",
      },
    ),
    usage: usage(16_200, 2_060, 0, 1, 5),
  },
];
