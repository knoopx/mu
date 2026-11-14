/**
 * The coverage scan: what counts as a block, and which domains are rows at all.
 *
 * The transcript is written into a temp folder and the rule registry is staged, so
 * the two things this file decides can be graded without reading a real `~/.pi`:
 * that only a tool result *opening* with a reason is a block — command output that
 * quotes reasons, and prose that quotes them, are not — and that the rows are the
 * domains the rule set holds today, never a name the scan invented on the way.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import type { GuardrailRule } from "../types";
import { guardrailCoverage, type GuardrailCoverage } from "./coverage";
import { guardrailRules, registerGuardrailRules } from "./rules";

/** A reason exactly as `blockReasonOf` writes one. */
const reason = (domain: string, ruleId: string): string =>
  `blocked(guardrails/${domain}): Use \`uv run --with <dependency>\` [${ruleId} on command, matched "python3 x"]`;

const line = (role: string, text: string, when: string): string =>
  JSON.stringify({
    type: "message",
    timestamp: when,
    message: { role, content: [{ type: "text", text }] },
  });

const RULES: GuardrailRule[] = [
  {
    id: "uv-python3",
    domain: "uv",
    message: "Use `uv run --with <dependency>`",
    language: "bash",
    query: "(program) @root",
  },
  {
    id: "sleep-bare",
    domain: "sleep",
    message: "Do not sleep in a command",
    language: "bash",
    query: "(program) @root",
  },
  {
    id: "nohup-bare",
    domain: "nohup",
    message: "Run in the foreground",
    language: "bash",
    query: "(program) @root",
  },
  // Two domains with nothing fired, named so a tie must break on the name.
  {
    id: "shell-files-shebang",
    domain: "shell-files",
    message: "Keep the shebang",
    language: "bash",
    query: "(program) @root",
  },
  {
    id: "container-runtime-run",
    domain: "container-runtime",
    message: "No container runs from the agent",
    language: "bash",
    query: "(program) @root",
  },
];

const NOW = Date.parse("2026-11-14T12:00:00.000Z");

const dir = mkdtempSync(join(tmpdir(), "mu-guardrails-coverage-"));

// One session in the folder, another one level down: the scan walks, it does not
// read only the top listing.
writeFileSync(
  join(dir, "fired.jsonl"),
  [
    // A real block: a tool result whose text opens with the reason.
    line("toolResult", reason("uv", "uv-python3"), "2026-11-14T10:00:00.000Z"),
    line("toolResult", reason("uv", "uv-python3"), "2026-11-14T10:05:00.000Z"),
    // The same reason quoted by a message: prose, not a block.
    line("user", reason("uv", "uv-python3"), "2026-11-14T10:01:00.000Z"),
    // Command output that *is* a quote of reasons — a grep over transcripts. Two
    // quoted marks and a newline must not add up to a domain of their own.
    line(
      "toolResult",
      "blocked(guardrails/package-manager\nblocked(guardrails/package-manager): … [pnpm-add on command]\n      1 blocked(guardrails/uv)",
      "2026-11-14T10:02:00.000Z",
    ),
    // A reason that starts further down the answer, not at its head.
    line(
      "toolResult",
      `scanned 3 files\n${reason("uv", "uv-python3")}`,
      "2026-11-14T10:03:00.000Z",
    ),
  ].join("\n") + "\n",
  "utf8",
);
mkdirSync(join(dir, "nested"));
writeFileSync(
  join(dir, "nested", "also-fired.jsonl"),
  [
    line(
      "toolResult",
      reason("sleep", "sleep-bare"),
      "2026-11-13T12:00:00.000Z",
    ),
    line("toolResult", reason("uv", "uv-python3"), "2026-11-13T12:30:00.000Z"),
  ].join("\n") + "\n",
  "utf8",
);

let hadRules: readonly GuardrailRule[];
beforeAll(() => {
  hadRules = guardrailRules();
  registerGuardrailRules(RULES);
});
afterAll(() => registerGuardrailRules(hadRules));

/** Scanned inside the tests, not in the suite body: the registry is only staged
 *  once `beforeAll` has run, and the rows are the registry's domains. */
let scan: GuardrailCoverage | null = null;
const run = (): GuardrailCoverage => (scan ??= guardrailCoverage(dir, 0, NOW));
const rows = (): Map<string, GuardrailCoverage["rows"][number]> =>
  new Map(run().rows.map((row) => [row.domain, row]));

describe("a coverage scan", () => {
  test("a tool result opening with a reason is one block", () => {
    expect(run().error).toBeNull();
    expect(rows().get("uv")?.blocks).toBe(3);
  });

  test("the walk reaches a session folder one level down", () => {
    expect(run().files).toBe(2);
    expect(rows().get("sleep")?.blocks).toBe(1);
    // `now` is handed in, so an elapsed figure is the same figure every run.
    expect(rows().get("uv")?.last).toBe("2h");
  });

  test("a quoted reason is not a block, and invents no domain", () => {
    // The grep output above quotes three reasons; none of them stopped a call.
    expect(
      run().rows.filter((row) => row.domain.includes("guardrails")),
    ).toEqual([]);
    expect(rows().has("package-manager")).toBe(false);
  });

  test("the busiest domain leads, and the quiet tail is named", () => {
    // Hits first, so what stops work is what a reader sees first; the name breaks
    // an equal count, so the same scan never lists itself in a new order.
    expect(run().rows.map((row) => row.domain)).toEqual([
      "uv",
      "sleep",
      "container-runtime",
      "nohup",
      "shell-files",
    ]);
  });

  test("a domain with nothing to report says so rather than vanishing", () => {
    expect(rows().get("nohup")?.blocks).toBe(0);
    expect(rows().get("nohup")?.never).toBe(true);
    expect(rows().get("uv")?.never).toBe(false);
  });
});
