import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  displayPath,
  muConfigDir,
  muDir,
  muStateDir,
} from "../../core/lib/utils/paths";
import {
  GUARDRAILS_DIR_NAME,
  FIXTURES_DIR_ENV,
  FIXTURES_FILE_SUFFIX,
  RULES_DIR_ENV,
  STATE_FILE_NAME,
} from "../constants";
import type { GuardrailRule } from "../types";
import { assertUsableRule, registerGuardrailRules } from "./rules";

const isFixturesFile = (file: string): boolean =>
  file.toLowerCase().endsWith(FIXTURES_FILE_SUFFIX);

const ruleFilesIn = (dir: string): string[] => {
  try {
    return readdirSync(dir)
      .filter(
        (file) => file.toLowerCase().endsWith(".json") && !isFixturesFile(file),
      )
      .sort();
  } catch {
    return [];
  }
};

export const suiteFilesIn = (dir: string): string[] => {
  try {
    return readdirSync(dir)
      .filter((file) => isFixturesFile(file))
      .sort();
  } catch {
    return [];
  }
};

const domainOf = (file: string): string => file.replace(/\.json$/i, "");

export const suiteDomainOf = (file: string): string =>
  file.slice(0, file.length - FIXTURES_FILE_SUFFIX.length);

export function rulesDir(env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv = env[RULES_DIR_ENV];
  if (fromEnv !== undefined && fromEnv.trim() !== "") return fromEnv.trim();
  return join(muConfigDir(env), GUARDRAILS_DIR_NAME);
}

export function fixturesDir(env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv = env[FIXTURES_DIR_ENV];
  if (fromEnv !== undefined && fromEnv.trim() !== "") return fromEnv.trim();
  return rulesDir(env);
}

export const ensureRulesDir = (env: NodeJS.ProcessEnv = process.env): string =>
  muDir(rulesDir(env));

export const ensureFixturesDir = (
  env: NodeJS.ProcessEnv = process.env,
): string => muDir(fixturesDir(env));

export interface GuardrailRuleFile {
  domain: string;
  path: string;
  rules: GuardrailRule[];
  error?: string;
}

const recordFields = (
  record: Record<string, unknown>,
  domain: string,
): GuardrailRule => ({
  id: String(record["id"] ?? ""),
  domain: String(record["domain"] ?? domain),
  language: (record["language"] ?? "bash") as GuardrailRule["language"],
  query: String(record["query"] ?? ""),
  message: String(record["message"] ?? ""),
  ...(typeof record["capture"] === "string"
    ? { capture: record["capture"] }
    : {}),
  ...(Array.isArray(record["tools"])
    ? { tools: (record["tools"] as unknown[]).map(String) }
    : {}),
  ...(Array.isArray(record["fields"])
    ? { fields: (record["fields"] as unknown[]).map(String) }
    : {}),
  ...(Array.isArray(record["filters"])
    ? { filters: record["filters"] as GuardrailRule["filters"] }
    : {}),
});

const parseRuleFile = (path: string, domain: string): GuardrailRuleFile => {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (cause) {
    return { domain, path, rules: [], error: String(cause) };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    return {
      domain,
      path,
      rules: [],
      error: `not valid JSON: ${String(cause)}`,
    };
  }
  if (!Array.isArray(parsed))
    return {
      domain,
      path,
      rules: [],
      error: "a rules file holds an array of rules",
    };
  const rules: GuardrailRule[] = [];
  const rejected: string[] = [];
  const seen = new Set<string>();
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) {
      rejected.push("an entry that is not an object");
      continue;
    }
    const rule = recordFields(entry as Record<string, unknown>, domain);
    try {
      assertUsableRule(rule, seen);
    } catch (cause) {
      rejected.push(cause instanceof Error ? cause.message : String(cause));
      continue;
    }
    seen.add(rule.id);
    rules.push(rule);
  }
  return {
    domain,
    path,
    rules,
    ...(rejected.length > 0 ? { error: rejected.join("; ") } : {}),
  };
};

export interface LoadedGuardrailRules {
  dir: string;
  files: GuardrailRuleFile[];
  rules: GuardrailRule[];
  errors: string[];
}

export function readRuleFiles(
  env: NodeJS.ProcessEnv = process.env,
): LoadedGuardrailRules {
  const dir = rulesDir(env);
  const files = ruleFilesIn(dir).map((file) =>
    parseRuleFile(join(dir, file), domainOf(file)),
  );
  return {
    dir,
    files,
    rules: files.flatMap((file) => file.rules),
    errors: files
      .filter((file) => file.error !== undefined)
      .map((file) => `${file.domain}: ${file.error}`),
  };
}

export function registerRulesFromDisk(
  env: NodeJS.ProcessEnv = process.env,
): LoadedGuardrailRules {
  const loaded = readRuleFiles(env);
  registerGuardrailRules(loaded.rules);
  return loaded;
}

/** A guardrail file is one plain JSON array, indented two, ending in a newline — rules and fixtures alike. */
export const writeJsonArray = (
  path: string,
  records: readonly unknown[],
): void => {
  const body = records.map((record) => JSON.stringify(record, null, 2));
  const text =
    body.length === 0
      ? "[]\n"
      : `[\n${body
          .join(",\n")
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n")}\n]\n`;
  writeFileSync(path, text, "utf8");
};

const writeRuleFile = (
  path: string,
  domain: string,
  rules: readonly GuardrailRule[],
): void => {
  writeJsonArray(
    path,
    rules
      .filter((rule) => rule.domain === domain)
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id)),
  );
};

export interface GuardrailRuleWrite {
  dir: string;
  path: string;
  domain: string;

  ok: boolean;
  detail: string;
  rules: number;
}

export function saveGuardrailRule(
  rule: GuardrailRule,
  env: NodeJS.ProcessEnv = process.env,
): GuardrailRuleWrite {
  const dir = ensureRulesDir(env);
  const path = join(dir, `${rule.domain}.json`);
  const loaded = parseRuleFile(path, rule.domain);
  const kept = loaded.rules.filter((existing) => existing.id !== rule.id);
  try {
    assertUsableRule(rule, new Set(kept.map((existing) => existing.id)));
  } catch (cause) {
    return {
      dir,
      path,
      domain: rule.domain,
      ok: false,
      detail: cause instanceof Error ? cause.message : String(cause),
      rules: loaded.rules.length,
    };
  }
  const next = [...kept, rule];
  writeRuleFile(path, rule.domain, next);
  return {
    dir,
    path,
    domain: rule.domain,
    ok: true,
    detail: loaded.rules.some((existing) => existing.id === rule.id)
      ? "replaced"
      : "added",
    rules: next.length,
  };
}

export function deleteGuardrailRule(
  domain: string,
  id: string,
  env: NodeJS.ProcessEnv = process.env,
): GuardrailRuleWrite {
  const dir = rulesDir(env);
  const path = join(dir, `${domain}.json`);
  const loaded = parseRuleFile(path, domain);
  if (loaded.rules.length === 0)
    return {
      dir,
      path,
      domain,
      ok: false,
      detail: loaded.error ?? `no rule ${id} in ${displayPath(path)}`,
      rules: 0,
    };
  const next = loaded.rules.filter((rule) => rule.id !== id);
  if (next.length === loaded.rules.length)
    return {
      dir,
      path,
      domain,
      ok: false,
      detail: `no rule ${id} in ${displayPath(path)}`,
      rules: next.length,
    };
  writeRuleFile(path, domain, next);
  return {
    dir,
    path,
    domain,
    ok: true,
    detail: next.length === 0 ? "domain file now empty" : "removed",
    rules: next.length,
  };
}

export interface PersistedGuardrailsState {
  armed: boolean;
  disarmed: string[];
}

export const stateFilePath = (env: NodeJS.ProcessEnv = process.env): string =>
  join(muStateDir(env), STATE_FILE_NAME);

export const ensureStateDir = (env: NodeJS.ProcessEnv = process.env): string =>
  muDir(muStateDir(env));

export function readGuardrailsState(
  env: NodeJS.ProcessEnv = process.env,
): PersistedGuardrailsState | null {
  let text: string;
  try {
    text = readFileSync(stateFilePath(env), "utf8");
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  const disarmed = Array.isArray(record["disarmed"])
    ? record["disarmed"].filter(
        (name): name is string => typeof name === "string",
      )
    : [];
  return {
    armed: record["armed"] !== false,
    disarmed,
  };
}

export function writeGuardrailsState(
  state: PersistedGuardrailsState,
  env: NodeJS.ProcessEnv = process.env,
): void {
  try {
    ensureStateDir(env);
    writeFileSync(
      stateFilePath(env),
      `${JSON.stringify(
        { armed: state.armed, disarmed: [...state.disarmed].sort() },
        null,
        2,
      )}\n`,
      "utf8",
    );
  } catch {}
}

export const rulesDirDisplay = (env: NodeJS.ProcessEnv = process.env): string =>
  displayPath(rulesDir(env), env);

export const fixturesDirDisplay = (
  env: NodeJS.ProcessEnv = process.env,
): string => displayPath(fixturesDir(env), env);
