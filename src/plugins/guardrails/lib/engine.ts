import { Language, Parser, Tree } from "web-tree-sitter";

import { BLOCK_REASON_PREFIX } from "../constants";
import type {
  GuardrailEvaluation,
  GuardrailHit,
  GuardrailLanguage,
  GuardrailRule,
  GuardrailSkipReason,
} from "../types";
import { languagesInUse, rulesForSource } from "./rules";
import { guardrailsStore } from "./store";
import { compiledQuery, matchRule } from "./treeSitter/queries";
import {
  loadGrammar,
  parseWithinBudget,
  residentGrammar,
  warmRuntime,
} from "./treeSitter/runtime";
import { guardedSourcesOf, type GuardedSource } from "./treeSitter/source";

export interface ToolCallLike {
  toolName: string;
  toolCallId: string;
  input?: Record<string, unknown>;
}

const emptyEvaluation = (
  language: GuardrailLanguage | null,
  skip: GuardrailSkipReason,
  sources = 0,
  engineMs = 0,
): GuardrailEvaluation => ({
  primary: null,
  hits: [],
  skip,
  engineMs,
  language,
  sources,
});

const millis = (started: number): number =>
  Math.round((performance.now() - started) * 10) / 10;

interface HitContext {
  tool: string;
  toolCallId: string;
  language: GuardrailLanguage;
  field: string;
  text: string;
  engineMs: number;
}

function hitsOf(
  rules: readonly GuardrailRule[],
  grammar: Language,
  tree: Tree,
  context: HitContext,
): GuardrailHit[] {
  const hits: GuardrailHit[] = [];
  for (const rule of rules) {
    const compiled = compiledQuery(rule, grammar);
    if (compiled.query === null) continue;
    const match = matchRule(rule, compiled, tree, context.text);
    if (match === null) continue;
    hits.push({
      ruleId: rule.id,
      domain: rule.domain,
      message: rule.message,
      tool: context.tool,
      toolCallId: context.toolCallId,
      language: context.language,
      field: context.field,
      text: context.text,
      start: match.start,
      end: match.end,
      matchText: match.text,
      engineMs: context.engineMs,
      blocked: guardrailsStore.isArmed(rule.domain),
      at: Date.now(),
    });
  }
  return hits;
}

interface SourceOutcome {
  hits: GuardrailHit[];
  skip: GuardrailSkipReason | null;
}

async function evaluateSource(
  source: GuardedSource,
  toolCallId: string,
): Promise<SourceOutcome> {
  const rules = rulesForSource(source);
  if (rules.length === 0) return { hits: [], skip: "no-rules" };

  const grammar =
    residentGrammar(source.language) ?? (await loadGrammar(source.language));
  if (grammar === null) return { hits: [], skip: "no-grammar" };

  const parser = new Parser();
  parser.setLanguage(grammar);
  try {
    const { tree, timedOut } = parseWithinBudget(parser, source.text);
    if (tree === null)
      return { hits: [], skip: timedOut ? "timeout" : "engine-failed" };
    const hits = hitsOf(rules, grammar, tree, {
      tool: source.tool,
      toolCallId,
      language: source.language,
      field: source.field,
      text: source.text,
      engineMs: 0,
    });
    tree.delete();
    return { hits, skip: hits.length === 0 ? "no-match" : null };
  } finally {
    parser.delete();
  }
}

export async function evaluateToolCall(
  call: ToolCallLike,
): Promise<GuardrailEvaluation> {
  const started = performance.now();
  const sources = guardedSourcesOf(call.toolName, call.input);
  if (sources.length === 0) return emptyEvaluation(null, "unguarded-tool");

  const readable = sources.filter((source) => source.text.trim() !== "");
  if (readable.length === 0)
    return emptyEvaluation(
      sources[0]?.language ?? null,
      "empty",
      sources.length,
    );

  const hits: GuardrailHit[] = [];
  const skips: GuardrailSkipReason[] = [];
  for (const source of readable) {
    const outcome = await evaluateSource(source, call.toolCallId);
    hits.push(...outcome.hits);
    if (outcome.skip !== null) skips.push(outcome.skip);
  }
  const engineMs = millis(started);
  for (const hit of hits) hit.engineMs = engineMs;

  const language = hits[0]?.language ?? readable[0]?.language ?? null;
  if (hits.length === 0)
    return {
      primary: null,
      hits,
      skip: skippedEngine(skips),
      engineMs,
      language,
      sources: sources.length,
    };

  return {
    primary: hits.find((hit) => hit.blocked) ?? null,
    hits,
    skip: null,
    engineMs,
    language,
    sources: sources.length,
  };
}

function skippedEngine(
  skips: readonly GuardrailSkipReason[],
): GuardrailSkipReason {
  for (const reason of ["no-grammar", "engine-failed", "timeout"] as const) {
    if (skips.includes(reason)) return reason;
  }
  return skips.includes("no-rules") ? "no-rules" : "no-match";
}

export function blockReasonOf(hit: GuardrailHit): string {
  const match = hit.matchText.trim();
  const short = match.length > 120 ? `${match.slice(0, 120)}…` : match;
  return `${BLOCK_REASON_PREFIX}/${hit.domain}): ${hit.message} [${hit.ruleId} on ${hit.field}, matched "${short}"]`;
}

export async function warmGuardrails(): Promise<void> {
  await warmRuntime(languagesInUse());
}
