import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { answer, failed, ran, usage, userTurn } from "../turn";

const GREP_FAINT = [
  "src/plugins/figures/components/TableToolRows.tsx:74: borderBottomWidth: HAIRLINE,",
  "src/plugins/figures/components/TableToolRows.tsx:75: borderBottomColor: t.color.divider.faint,",
  "src/plugins/openui/components/library/data.tsx:120: borderColor: t.color.divider.faint,",
  "src/plugins/code-quality/lib/toolView.ts:88: // the meter track vanished here too",
  "src/plugins/core/lib/ui/tokens.ts:12: export const HAIRLINE = 1;",
].join("\n");

export const THEME_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-faint-rules",
    "in nightsky the tables have no lines. the rows are there, the header is there, and the thing that makes it a table is missing — and it is not missing in light",
    0,
  ),
  ran(
    "c-grep-faint",
    "grep",
    { pattern: "divider.faint", path: "src/plugins" },
    GREP_FAINT,
    3_000,
  ),
  ran(
    "c-read-theme",
    "read",
    { path: "src/plugins/core/lib/ui/theme.ts", offset: 40, limit: 28 },
    [
      "/**",
      " * `divider.faint` is the log's own background in nightsky and the card's in dark:",
      " * a hairline painted with it draws nothing. It is only ever an edge on a surface",
      " * that fills itself — a chip over its own `surface.button`.",
      " */",
      "export function ruleColor(t: AdwaitaTheme): string {",
      "  return t.color.divider.default;",
      "}",
    ].join("\n"),
    7_000,
  ),
  failed(
    "c-edit-token",
    "edit",
    {
      path: "src/plugins/core/lib/ui/tokens.ts",
      edits: [
        {
          oldText: "export const HAIRLINE = 1;",
          newText: "export const HAIRLINE = 2;",
        },
      ],
    },
    "Error: a thicker rule is not a visible rule. The colour is the bug: divider.faint resolves to the background it is drawn on.",
    11_000,
  ),
  ran(
    "c-edit-rules",
    "edit",
    {
      path: "src/plugins/figures/components/TableToolRows.tsx",
      edits: [
        {
          oldText: "        borderBottomColor: t.color.divider.faint,",
          newText: "        borderBottomColor: ruleColor(t),",
        },
      ],
    },
    "Successfully replaced 1 block(s) in src/plugins/figures/components/TableToolRows.tsx.",
    15_000,
  ),
  {
    ...answer(
      "a-faint-rules",
      [
        "Every rule in the log is painted `divider.default` now — table cell rules, the meter track, the line under a program row. `divider.faint` is not a fainter line, it is *the colour of the surface behind the line*, so in nightsky it drew the log's own background over the log and left the table with nothing holding it apart. Light looked fine by accident: there, faint is a real grey.",
        "",
        "Three files fixed, one helper (`ruleColor`) so a component cannot reach for a divider colour by hand again. `faint` is now only used where a shape fills itself first.",
      ].join("\n"),
      {
        reasoning:
          "The report was 'the lines are missing in one theme', which reads like a contrast complaint and is not. A colour whose value equals the background it sits on is not a lighter line, it is an invisible one — and a name like `faint` invites exactly that mistake, so the fix is a named helper plus a comment where the trap is.",
      },
    ),
    usage: usage(14_700, 2_320, 0, 1, 4),
  },
];
