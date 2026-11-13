import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { answer, failed, ran, usage, userTurn } from "../turn";

const MODELS_CONFIG = [
  "{",
  '  "default": "local/ostfralla/Qwen3.8-27B",',
  '  "thinking": { "default": "xhigh", "byTask": {} },',
  '  "providers": {',
  '    "local": { "baseUrl": "http://127.0.0.1:8080", "contextWindow": 131072 },',
  '    "openrouter": { "apiKeyEnv": "OPENROUTER_API_KEY", "contextWindow": 200000 }',
  "  }",
  "}",
].join("\n");

const NO_BENCH = [
  'error: script "bench:models" not found',
  "",
  "available scripts:",
  "  dev         bun --hot app.tsx",
  "  typecheck   tsc --noEmit",
  "  storybook   storybook .",
].join("\n");

const GREP_THINKING = [
  "src/plugins/core/lib/agent/thinking.ts:12: export const THINKING_LEVELS = [",
  "src/plugins/core/lib/agent/thinking.ts:31: export function budgetFor(level: ThinkingLevel): number {",
  'src/plugins/core/lib/agent/thinking.ts:44:   return level === "off" ? 0 : Math.min(32_000, window / 4);',
  "src/plugins/core/hooks/useModelPanel.ts:18: const rows = bridge.availableModels.map(toRow);",
].join("\n");

const TURN_LEDGER = [
  "turn  model                     thinking  in      out     wall",
  " 41   Qwen3.8 27B · llama.cpp   xhigh     14 820   1 240   4m 02s",
  " 40   Qwen3.8 27B · llama.cpp   xhigh     14 310     860   2m 51s",
  " 39   Qwen3.8 27B · llama.cpp   high      13 940     640   1m 12s",
  " 38   Qwen3.8 27B · llama.cpp   off       13 610     590      38s",
].join("\n");

export const MODEL_PICK_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-model-slow",
    "that last answer took four minutes to move two lines of text. what was i actually paying for, and put me on something quicker while all i'm doing is moving text around",
    0,
  ),
  ran(
    "c-read-models",
    "read",
    { path: "~/.config/mu/models.json" },
    MODELS_CONFIG,
    4_000,
  ),
  failed(
    "c-bench",
    "bash",
    { command: "bun run bench:models" },
    NO_BENCH,
    9_000,
  ),
  ran(
    "c-ledger",
    "bash",
    { command: "mu stats turns --last 4 --thinking" },
    TURN_LEDGER,
    13_000,
  ),
  ran(
    "c-grep-thinking",
    "grep",
    { pattern: "thinkingLevel", path: "src/plugins/core" },
    GREP_THINKING,
    17_000,
  ),
  {
    ...answer(
      "a-model-slow",
      [
        "Four minutes was not the model, it was the reasoning: turn 41 spent **1 240 output tokens thinking** before it wrote one line, and `xhigh` is the level every turn in this session has been running at.",
        "",
        "| turn | thinking | out | wall |",
        "| --- | --- | --- | --- |",
        "| 41 | xhigh | 1 240 | 4m 02s |",
        "| 39 | high | 640 | 1m 12s |",
        "| 38 | off | 590 | 38s |",
        "",
        "Same model, same prompt shape, a 6x spread. The `Ctrl+T` panel is the dial — I have left it on `xhigh` because the next thing on this session's list is the compaction bug, and that one is worth thinking about. Switch me when you move text, not now.",
      ].join("\n"),
      {
        reasoning:
          "The user read the wall time as a model-speed problem. It is not: the tokens of reasoning are billed and streamed like any other output, and the status bar counts them, so the ledger is the honest answer. Recommending a model switch would have been wrong — the model is local and free; the level is the cost. Leave the choice with the user, and say why the next task argues the other way.",
      },
    ),
    usage: usage(11_400, 1_860, 0, 1, 3),
  },
];

export const THINKING_LEVEL_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-thinking-level",
    "the compaction bug needs real thought — take the reasoning up for this session, and tell me what each level actually changes in this app before i pick",
    0,
  ),
  ran(
    "c-read-budget",
    "read",
    { path: "src/plugins/core/lib/agent/thinking.ts", offset: 12, limit: 36 },
    [
      "export const THINKING_LEVELS = [",
      '  "off",',
      '  "low",',
      '  "medium",',
      '  "high",',
      '  "xhigh",',
      '  "max",',
      "] as const;",
      "",
      "export function budgetFor(level: ThinkingLevel, window: number): number {",
      '  if (level === "off") return 0;',
      '  if (level === "max") return window / 2;',
      "  const share = SHARES[level];",
      "  return Math.min(CAP, Math.floor(window * share));",
      "}",
    ].join("\n"),
    3_000,
  ),
  ran(
    "c-grep-usage",
    "grep",
    { pattern: "reasoningDetails", path: "src/plugins/core/lib/agent" },
    [
      "src/plugins/core/lib/agent/transcriptState.ts:96: reasoning?: string;",
      'src/plugins/core/lib/agent/turnStats.ts:64: if (item.kind === "assistant" && item.reasoning)',
      'src/plugins/core/components/ReasoningRow.tsx:31: <Collapsible title="Reasoning" defaultOpen={risky}>',
    ].join("\n"),
    7_000,
  ),
  {
    ...answer(
      "a-thinking-level",
      [
        "`thinking` is a token budget on the same window, so the levels differ only in how much of it the model may spend before it answers:",
        "",
        "- **off** — no reasoning block at all; the answer arrives first and the log has nothing to unfold",
        "- **low / medium** — ~8% and ~16% of the window: fine for renames, formatting, moving a function",
        "- **high** — ~25%: where a multi-file change starts to hold its whole plan",
        "- **xhigh** (current) — the cap, 32 000 tokens: what a bug you have not located yet needs",
        "- **max** — half the window, and the ring in the composer border turns red a lot faster",
        "",
        "Nothing in the app changes shape: the reasoning row is the same row, open when the turn touched something risky and folded when it did not. Pick `xhigh`, leave `max` for the day the compaction bug still refuses to reproduce.",
      ].join("\n"),
    ),
    usage: usage(9_800, 2_240, 0, 1, 2),
  },
];
