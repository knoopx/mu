import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { answer, ran, userTurn, usage } from "../turn";

/** pi's own header, because that is what the row strips. */
const SCRIPT_OUTPUT = [
  "Script completed",
  "Wall time 4.2 seconds",
  "Output:",
  "",
  "==> text 1/3 <==",
  '{"tool":"vcs-log","calls":12,"failures":0}',
  "==> text 2/3 <==",
  "12 of 14 sessions called vcs-log; 0 were blocked by a guardrail",
  "==> text 3/3 <==",
  '{"suite":"package-manager","pass":4,"fail":0}',
].join("\n");

export const CODEMODE_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-code",
    "how often do my own sessions actually use the vcs tools, and did guardrails ever stop one? write it as one script, not eleven commands",
    0,
  ),
  ran(
    "c-script",
    "codemode",
    {
      script:
        'const sessions = await tools.vcs_log({ limit: 200 });\nconst hits = sessions.filter(s => s.calls > 0);\nconsole.log(JSON.stringify({ tool: "vcs-log", calls: hits.length, failures: 0 }));\nconst cov = await tools.guardrails_coverage({ days: 7 });\n…',
    },
    SCRIPT_OUTPUT,
    4_200,
    {
      details: {
        calls: [
          {
            name: "vcs-log",
            args: "{ limit: 200 }",
            status: "ok",
            durationMs: 640,
            cost: null,
            error: "",
          },
          {
            name: "guardrails-coverage",
            args: "{ days: 7 }",
            status: "ok",
            durationMs: 1_180,
            cost: null,
            error: "",
          },
          {
            name: "guardrails-test",
            args: '{ domain: "package-manager" }',
            status: "error",
            durationMs: 900,
            cost: null,
            error:
              "blocked(guardrails/uv): suite run refused a raw python3 invocation",
          },
          {
            name: "table-render",
            args: "{ rows: 12, columns: 4 }",
            status: "ok",
            durationMs: 120,
            cost: null,
            error: "",
          },
        ],
        fullOutputPath: "",
      },
    },
  ),
  {
    ...answer(
      "a-code",
      [
        "Twelve of the fourteen sessions in the last week called `vcs-log`, twice called `vcs-file-diff`, and none were blocked by a rule — the guardrail that stops them is `uv`, and it stopped a nested call *inside* this script, which is the interesting part of the answer: a blocked call in a script shows up as that script's own row, numbered, with its error line, not as a row in the log.",
        "",
        "One script, four tool calls, 4.2 seconds. The output came back in pi's separators, so the three figures stayed three figures instead of folding into one paragraph.",
      ].join("\n"),
      {
        reasoning:
          "The question counts things across sessions, which is a fold over transcripts and belongs in one script. The answer has to name the nested block, because that is the behaviour the log would otherwise hide.",
      },
    ),
    usage: usage(8_900, 1_120, 0, 1, 0),
  },
];
