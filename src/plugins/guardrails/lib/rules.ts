import { COMMAND_INPUT_KEYS } from "../constants";
import { GRAMMAR_ASSETS } from "./treeSitter/grammar";
import { invalidateQueries } from "./treeSitter/queries";
import type { GuardedSource } from "./treeSitter/source";
import type { GuardrailLanguage, GuardrailRule } from "../types";

let rules: GuardrailRule[] = [];
let version = 0;

export function assertUsableRule(rule: GuardrailRule, seen: Set<string>): void {
  if (rule.id.trim() === "") throw new Error("guardrail rule id is empty");
  if (seen.has(rule.id))
    throw new Error(`guardrail rule id ${rule.id} is twice`);
  if (rule.domain.trim() === "")
    throw new Error(`guardrail rule ${rule.id} has no domain`);
  if (rule.message.trim() === "")
    throw new Error(`guardrail rule ${rule.id} has no message`);
  if (rule.query.trim() === "")
    throw new Error(`guardrail rule ${rule.id} has no query`);
  if (GRAMMAR_ASSETS[rule.language] === undefined)
    throw new Error(
      `guardrail rule ${rule.id} names ${rule.language}, which ships no grammar`,
    );
  if (rule.tools !== undefined && rule.tools.length === 0)
    throw new Error(`guardrail rule ${rule.id} names no tool in \`tools\``);
  if (rule.fields !== undefined && rule.fields.length === 0)
    throw new Error(`guardrail rule ${rule.id} names no field in \`fields\``);
  for (const filter of rule.filters ?? []) {
    if (filter.regex.trim() === "")
      throw new Error(`guardrail rule ${rule.id} has a filter with no regex`);
    try {
      new RegExp(filter.regex, filter.flags);
    } catch (error) {
      throw new Error(
        `guardrail rule ${rule.id} has a filter that is not a regular expression: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  seen.add(rule.id);
}

export function registerGuardrailRules(next: readonly GuardrailRule[]): number {
  const seen = new Set<string>();
  for (const rule of next) assertUsableRule(rule, seen);
  rules = [...next];
  version += 1;
  invalidateQueries();
  return version;
}

export function guardrailRules(): readonly GuardrailRule[] {
  return rules;
}

export function rulesForLanguage(
  language: GuardrailLanguage,
): readonly GuardrailRule[] {
  return rules.filter((rule) => rule.language === language);
}

const fieldsOf = (rule: GuardrailRule): readonly string[] =>
  rule.fields ?? COMMAND_INPUT_KEYS;

export function rulesForSource(
  source: GuardedSource,
): readonly GuardrailRule[] {
  return rules.filter(
    (rule) =>
      rule.language === source.language &&
      (rule.tools === undefined || rule.tools.includes(source.tool)) &&
      fieldsOf(rule).includes(source.field),
  );
}

export function languagesInUse(): GuardrailLanguage[] {
  const seen: GuardrailLanguage[] = [];
  for (const rule of rules) {
    if (!seen.includes(rule.language)) seen.push(rule.language);
  }
  return seen;
}

export function guardrailDomains(): readonly string[] {
  const seen: string[] = [];
  for (const rule of rules) {
    if (!seen.includes(rule.domain)) seen.push(rule.domain);
  }
  return seen;
}

export function rulesVersion(): number {
  return version;
}
