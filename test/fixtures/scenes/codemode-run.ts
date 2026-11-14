import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { answer, ran, userTurn, usage } from "../turn";

/** pi's own header, because that is what the row strips. */
const SCRIPT_OUTPUT = [
  "Script completed",
  "Wall time 4.2 seconds",
  "Output:",
  "",
  "==> text 1/3 <==",
  "vcs-log: 12 calls",
  "vcs-file-diff: 2 calls",
  "==> text 2/3 <==",
  "12 of 14 sessions called vcs-log",
  "==> text 3/3 <==",
  "guardrails/uv: 1 blocked",
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
      // pi's codemode tool names its parameter `code`, and the row reads the
      // script out of that key: the header quotes its first real line and the body
      // paints the rest of it. Under any other name the call has no script to show
      // and the header falls back to the tool's own name, printing `codemode` twice.
      code: [
        "const sessions = await tools.vcs_log({ limit: 200 });",
        "const byTool = new Map();",
        "for (const s of sessions)",
        "  for (const c of s.calls) byTool.set(c.name, (byTool.get(c.name) ?? 0) + 1);",
        "const blocked = (await tools.guardrails_coverage({ days: 7 })).domains",
        "  .filter((d) => d.blocks > 0);",
        'text([...byTool].sort((a, b) => b[1] - a[1]).map(([n, k]) => `${n}: ${k} calls`).join("\\n"));',
        'text(blocked.map((d) => `${d.domain}: ${d.blocks} blocked`).join("\\n"));',
        'await tools.chart_render({ points: [...byTool].map(([n, k]) => [n, k]), unit: "calls" });',
      ].join("\n"),
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
            name: "chart-render",
            args: "{ points: 14, unit: 'calls' }",
            status: "ok",
            durationMs: 140,
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
      "Twelve of the fourteen sessions last week called `vcs-log`, and the only call a rule ever stopped is row 3 of this script — a block inside a script is not a row in the log.",
    ),
    usage: usage(8_900, 1_120, 0, 1, 2),
  },
];
