import { Language, Node, Query, Tree } from "web-tree-sitter";

import type { GuardrailRule } from "../../types";
import { grammarEpoch } from "./runtime";

/**
 * Compiled queries and the matching step.
 *
 * A `Query` is native memory bound to one `Language` instance, and a grammar
 * reload mints a new instance — so the cache is keyed by the runtime's grammar
 * epoch as well as the rule id, and stale queries are deleted, not reused.
 */

interface Compiled {
  query: Query | null;
  filters: CompiledFilter[];
  error?: string;
}

interface CompiledFilter {
  regex: RegExp;
  capture: string | null;
  not: boolean;
}

const cache = new Map<string, Compiled>();

const keyOf = (rule: GuardrailRule, epoch: number): string =>
  `${rule.id}@${epoch}`;

function compileFilters(rule: GuardrailRule): CompiledFilter[] {
  const filters: CompiledFilter[] = [];
  for (const filter of rule.filters ?? []) {
    try {
      filters.push({
        regex: new RegExp(filter.regex, filter.flags),
        capture: filter.capture ?? null,
        not: filter.not === true,
      });
    } catch {
      // A filter that is not a valid expression fails the rule closed: a rule
      // that cannot be read blocks nothing, and the panel names it.
      filters.push({
        regex: /(?!)/,
        capture: filter.capture ?? null,
        not: true,
      });
    }
  }
  return filters;
}

/** The rule's query, compiled once per grammar epoch. */
export function compiledQuery(
  rule: GuardrailRule,
  language: Language,
): Compiled {
  const key = keyOf(rule, grammarEpoch());
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  try {
    const compiled: Compiled = {
      query: new Query(language, rule.query),
      filters: compileFilters(rule),
    };
    cache.set(key, compiled);
    return compiled;
  } catch (error) {
    const compiled: Compiled = {
      query: null,
      filters: [],
      error: error instanceof Error ? error.message : String(error),
    };
    cache.set(key, compiled);
    return compiled;
  }
}
/** Frees every compiled query. The registry calls this when rules change. */
export function invalidateQueries(): void {
  for (const compiled of cache.values()) compiled.query?.delete();
  cache.clear();
}

export interface RuleMatch {
  start: number;
  end: number;
  text: string;
}

/** A filter's `capture` may name the whole guarded text instead of a node. */
const WHOLE_SOURCE_CAPTURE = "$";

function filterText(
  filter: CompiledFilter,
  captures: Map<string, Node>,
  marked: Node,
  source: string,
): string | null {
  if (filter.capture === null) return marked.text;
  if (filter.capture === WHOLE_SOURCE_CAPTURE) return source;
  // A filter naming a capture the query does not produce cannot be evaluated,
  // so it yields no text and the rule does not fire.
  return captures.get(filter.capture)?.text ?? null;
}

function filtersPass(
  filters: readonly CompiledFilter[],
  captures: Map<string, Node>,
  marked: Node,
  source: string,
): boolean {
  for (const filter of filters) {
    const text = filterText(filter, captures, marked, source);
    if (text === null) return false;
    const matched = filter.regex.test(text);
    if (matched === filter.not) return false;
  }
  return true;
}

/**
 * The earliest node the rule marks, with its filters applied.
 *
 * `matches()` groups captures per match, which is what a filter needs: every
 * filter is tested against the captures of the same match, never against a
 * capture some other match contributed. Matches arrive in the order the query
 * found them, so the earliest by offset is chosen explicitly.
 */
export function matchRule(
  rule: GuardrailRule,
  compiled: Compiled,
  tree: Tree,
  source: string,
): RuleMatch | null {
  const query = compiled.query;
  if (query === null) return null;
  let best: RuleMatch | null = null;
  for (const match of query.matches(tree.rootNode)) {
    const captures = new Map<string, Node>();
    for (const capture of match.captures) {
      if (!captures.has(capture.name)) captures.set(capture.name, capture.node);
    }
    const marked =
      rule.capture === undefined
        ? match.captures[0]?.node
        : captures.get(rule.capture);
    if (marked === undefined) continue;
    if (!filtersPass(compiled.filters, captures, marked, source)) continue;
    const candidate: RuleMatch = {
      start: marked.startIndex,
      end: marked.endIndex,
      text: marked.text,
    };
    if (best === null || candidate.start < best.start) best = candidate;
  }
  return best;
}
