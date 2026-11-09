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


