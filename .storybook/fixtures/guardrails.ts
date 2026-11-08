import type { TranscriptItem } from "../../src/plugins/core/lib/agent/transcriptState";
import { guardrailsStore } from "../../src/plugins/guardrails/lib/store";
import { registerGuardrailRules } from "../../src/plugins/guardrails/lib/rules";
import { blockReasonOf } from "../../src/plugins/guardrails/lib/engine";
import type { GuardrailHit, GuardrailRule } from "../../src/plugins/guardrails/types";
import { answer, at, failed, min, ran, userTurn } from "./turn";
import { toolCallFixture } from "./tool";


const rule = (
  id: string,
  domain: string,
  language: GuardrailRule["language"],
  message: string,
  query = "(command name: (command_name) @name) @command",
): GuardrailRule => ({ id, domain, language, message, query });

export const GUARDRAIL_RULES: GuardrailRule[] = [
  rule("pkg-npm", "package-manager", "bash", "Use Bun equivalents: `bun add`, `bun run`, `bun install`"),
  rule("pkg-global", "package-manager", "bash", "Install packages locally in the project with `bun add <package>`, not globally"),
  rule("pkg-npx", "package-manager", "bash", "Run a project binary through `bunx`, not `npx`"),
  rule("shell-sleep", "sleep", "bash", "Do not `sleep` to wait — run the dependent command directly, or poll the real condition"),
  rule("rm-trash", "trash-deletion", "bash", "Move files to the trash instead of deleting them with `rm`"),
  rule("rm-recursive", "trash-deletion", "bash", "A recursive `rm` is a directory gone — name the files, or use the changes panel"),
  rule("docker-podman", "container-runtime", "bash", "Use Podman instead of Docker"),
  rule("nix-env", "nix", "bash", "Install into the dev shell in flake.nix, not with `nix-env -iA`"),
  rule("nix-flake-update", "nix", "bash", "Update one input: `nix flake update --flake-input`"),
  rule("jj-abandon-unclean", "jj", "bash", "Abandon only after the change is committed elsewhere"),
  rule(
    "py-print",
    "python",
    "python",
    "Log through the module logger, not `print`",
    "(expression_statement (call function: (identifier) @name)) @call",
  ),
  rule(
    "ts-console",
    "typescript",
    "tsx",
    "Log through `logger`, not `console.log`",
    "(call_expression function: (member_expression property: (property_identifier) @name)) @call",
  ),
];

const hit = (
  toolCallId: string,
  ruleId: string,
  domain: string,
  message: string,
  command: string,
  matchText: string,
  engineMs: number,
  blocked: boolean,
  ms: number,
): GuardrailHit => ({
  ruleId,
  domain,
  message,
  tool: "bash",
  toolCallId,
  language: "bash",
  field: "command",
  text: command,
  start: 0,
  end: matchText.length,
  matchText,
  engineMs,
  blocked,
  at: at(min(ms)),
});

export const GUARDRAIL_HITS: GuardrailHit[] = [
  hit(
    "g-npm-i",
    "pkg-npm",
    "package-manager",
    "Use Bun equivalents: `bun add`, `bun run`, `bun install`",
    "npm i zod",
    "npm",
    0.5,
    true,
    34,
  ),
  hit(
    "g-bun-add-g",
    "pkg-global",
    "package-manager",
    "Install packages locally in the project with `bun add <package>`, not globally",
    "bun add -g eslint",
    "-g",
    0.2,
    true,
    33,
  ),
  hit(
    "g-sleep",
    "shell-sleep",
    "sleep",
    "Do not `sleep` to wait — run the dependent command directly, or poll the real condition",
    "bun run build && sleep 5 && bun test",
    "bun run build && sleep 5 && bun test",
    0.3,
    false,
    31,
  ),
];

export const GUARDRAIL_ROWS: TranscriptItem[] = [
  userTurn("g-user", "Wire up the schema package and typecheck.", 32),
  answer("g-a1", "Installing the schema package, then typechecking."),
  failed(
    "g-npm-i",
    "bash",
    { command: "npm i zod" },
    blockReasonOf(GUARDRAIL_HITS[0]),
    33,
  ),
  answer("g-a2", "Bun it is."),
  failed(
    "g-bun-add-g",
    "bash",
    { command: "bun add -g eslint" },
    blockReasonOf(GUARDRAIL_HITS[1]),
    33.5,
  ),
  answer("g-a3", "Local install, then the typecheck."),
  ran(
    "g-bun-add",
    "bash",
    { command: "bun add zod" },
    "bun add v1.4.4 (38afee6c8)\n\ninstalled zod@4.6.7\n\n1 package installed [220.00ms]",
    34,
  ),
  ran(
    "g-typecheck",
    "bash",
    { command: "bun run typecheck" },
    "$ tsc --noEmit",
    35,
  ),
];

export function guardrailsScene(): TranscriptItem[] {
  registerGuardrailRules(GUARDRAIL_RULES);
  guardrailsStore.setRules({
    dir: "~/.config/mu/guardrails",
    files: 8,
    errors: [],
  });
  guardrailsStore.setEngine({
    phase: "ready",
    bootMs: 5,
    grammars: ["bash"],
  });
  guardrailsStore.record(GUARDRAIL_HITS);
  return GUARDRAIL_ROWS;
}

export const GUARDRAIL_TOOL_ROWS: TranscriptItem[] = [
  userTurn("t-user", "Prove the package-manager rules before I ship them.", 12),
  answer("t-a1", "Running the suite, then the coverage report."),
  toolCallFixture(
    "t-test",
    "guardrails-test",
    { domain: "package-manager" },
    "ok",
    "",
    {
      startTs: at(min(12)),
      details: {
        dir: "~/.config/mu/guardrails",
        domain: "package-manager",
        fixture: null,
        suites: ["package-manager"],
        engine: { phase: "ready", bootMs: 5, grammars: ["bash"] },
        note: "",
        pass: 3,
        fail: 1,
        total: 4,
        rows: [
          {
            domain: "package-manager",
            id: "block-npm-i",
            command: "npm i zod",
            want: true,
            got: true,
            status: "PASS",
            detail: "",
          },
          {
            domain: "package-manager",
            id: "block-bun-add-g",
            command: "bun add -g eslint",
            want: true,
            got: true,
            status: "PASS",
            detail: "",
          },
          {
            domain: "package-manager",
            id: "ok-bun-add",
            command: "bun add zod",
            want: false,
            got: false,
            status: "PASS",
            detail: "",
          },
          {
            domain: "package-manager",
            id: "ok-bun-run-group",
            command: "bun run build --group",
            want: false,
            got: true,
            status: "FAIL",
            detail: "blocked by pkg-global — the suite wants it released",
          },
        ],
      },
    },
  ),
  answer(
    "t-a2",
    "One false positive — `-g` after a subcommand. Adding the case, then coverage.",
  ),
  toolCallFixture(
    "t-write",
    "guardrails-fixture-update",
    { domain: "package-manager" },
    "ok",
    "",
    {
      startTs: at(min(12.5)),
      details: {
        dir: "~/.config/mu/guardrails",
        domain: "package-manager",
        path: "~/.config/mu/guardrails/package-manager.fixtures.json",
        before: 3,
        ops: [
          {
            op: "write",
            id: "ok-bun-run-group",
            status: "ok",
            detail: "added",
          },
          { op: "delete", id: "ok-stale-yarn", status: "ok", detail: "" },
          {
            op: "write",
            id: "block-no-command",
            status: "fail",
            detail: "fixture is a bash call with no input.command",
          },
        ],
        written: 1,
        deleted: 1,
        failed: 1,
      },
    },
  ),
  toolCallFixture("t-coverage", "guardrails-coverage", { days: 7 }, "ok", "", {
    startTs: at(min(13)),
    details: {
      dir: "~/.pi/agent/sessions",
      files: 41,
      windowDays: 7,
      ruleCount: 5,
      truncated: false,
      note: "",
      rows: [
        {
          domain: "package-manager",
          source: "ruled",
          blocks: 6,
          last: "2h",
          never: false,
        },
        {
          domain: "permission-gate",
          source: "ruled",
          blocks: 2,
          last: "3d",
          never: false,
        },
        { domain: "sleep", source: "ruled", blocks: 0, last: "", never: true },
        {
          domain: "container-runtime",
          source: "legacy",
          blocks: 1,
          last: "9d",
          never: false,
        },
      ],
    },
  }),
  answer(
    "t-a3",
    "Suite is green after the new case, and coverage says sleep has never fired.",
  ),
];

export function guardrailsTendedScene(): TranscriptItem[] {
  guardrailsStore.setEngine({ phase: "ready", bootMs: 5, grammars: ["bash"] });
  return GUARDRAIL_TOOL_ROWS;
}
