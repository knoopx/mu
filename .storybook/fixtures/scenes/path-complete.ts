import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { answer, ran, running, usage, userTurn } from "../turn";

const GREP_AUTOCOMPLETE = [
  'src/plugins/core/components/composer/Composer.tsx:412: onKey("editor.autocomplete", complete);',
  'src/plugins/core/lib/composer/keyRouter.ts:88: case "editor.autocomplete": return panelActions.completePath();',
  "src/plugins/core/lib/composer/mode.ts:57: export const isCompletionMode = (mode: ComposerMode): boolean =>",
  "src/plugins/core/lib/composer/pathCompletion.ts:24: export function trailingPathToken(draft: string): string | null {",
  'src/plugins/core/lib/composer/pathCompletion.ts:61: const cycle = intent === "complete";',
].join("\n");

export const PATH_PICK_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-path-tab",
    "tab is supposed to complete the path i'm typing in the draft, not open the file panel. the panel is for picking a file by name — this is the other thing, and it has to stay in the draft",
    0,
  ),
  ran(
    "c-grep-tab",
    "grep",
    { pattern: "editor.autocomplete", path: "src/plugins/core" },
    GREP_AUTOCOMPLETE,
    4_000,
  ),
  ran(
    "c-read-mode",
    "read",
    {
      path: "src/plugins/core/lib/composer/mode.ts",
      offset: 44,
      limit: 26,
    },
    [
      "export function isCompletionMode(mode: ComposerMode | null): boolean {",
      '  return mode?.kind === "pick" && mode.target === "path";',
      "}",
      "",
      "/** Tab completes, Enter commits: a folder keeps the list open, a file closes it. */",
      'export type PickIntent = "complete" | "commit";',
      "",
      "export function pickMode(target: ComposerTarget, query?: string): ComposerMode {",
      '  return { kind: "pick", target, index: 0, query: query ?? "" };',
      "}",
    ].join("\n"),
    8_000,
  ),
  ran(
    "c-edit-router",
    "edit",
    {
      path: "src/plugins/core/lib/composer/keyRouter.ts",
      edits: [
        {
          oldText: 'case "editor.autocomplete": return openFilePanel();',
          newText:
            'case "editor.autocomplete":\n  if (!isCompletionMode(mode)) return consume();\n  return panelActions.completePath(intentOf(event));',
        },
      ],
    },
    "Successfully replaced 1 block(s) in src/plugins/core/lib/composer/keyRouter.ts.",
    13_000,
  ),
  running("c-read-files", "read", {
    path: "src/plugins/core/lib/files/fileList.ts",
    offset: 1,
    limit: 40,
  }),
  {
    ...answer(
      "a-path-tab",
      "Tab is now the draft's key, not the panel's. A trailing path token in the draft — `~/`, `./src/`, `../notes/`, `@x`, anything with a `/` — opens the list over the draft, and the list *is* the draft: typing narrows it, Tab takes the highlighted name, and a folder keeps the panel open so the next Tab goes a level deeper. Enter commits the name and closes it. Neither key sends the draft: a panel is a choice, never a message.",
      {
        reasoning:
          "Two different jobs were sharing one key. `Ctrl+P` finds a file in the project by name and inserts it; Tab completes the path the hands are already typing. The router was answering the first for both, so the draft lost its completion. Keeping the distinction in the mode (`isCompletionMode`) rather than in the key handler is what stops them being merged again.",
      },
    ),
    usage: usage(13_900, 1_520, 0, 1, 4),
  },
];
