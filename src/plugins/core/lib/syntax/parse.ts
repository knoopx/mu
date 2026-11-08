import { Parser, type Node } from "web-tree-sitter";
import type { DiffToken, DiffTokenKind } from "adwaita-gpuix";

import type { GuardrailLanguage } from "../../../guardrails/types";
import {
  loadGrammar,
  parseWithinBudget,
} from "../../../guardrails/lib/treeSitter/runtime";
import { leafKindOf, strongKindOf } from "./kinds";

/**
 * Source text into the kinds of thing each of its lines is made of.
 *
 * The parse is a walk, not a query: a node's *name* says what it is, and the
 * walk answers a comment, a string, a number or a keyword from that name. Only
 * the outermost node of a strong kind is painted, and a painted character is
 * never painted again, so a keyword inside a string stays part of the string.
 *
 * Everything here fails open. A grammar that is not loaded, a parse that runs
 * out of its time budget, a document too big to read — each answers with
 * nothing, and the row it was for is drawn in one colour. A diff that cannot be
 * read as code still says what changed.
 */

/** Text this long is not a hunk of a diff, whatever the patch claims. */
const MAX_DOC_CHARS = 24_000;

/** Nodes one walk will visit before it gives up on a document. */
const MAX_NODES = 30_000;

/** Parsed documents kept, so the same file read twice is parsed once. */
const CACHE_LIMIT = 160;

const parsers = new Map<GuardrailLanguage, Parser>();
const cache = new Map<string, DiffToken[][]>();

function parserFor(language: GuardrailLanguage): Parser {
  const cached = parsers.get(language);
  if (cached !== undefined) return cached;
  const parser = new Parser();
  parsers.set(language, parser);
  return parser;
}

function calledAfter(text: string, at: number): boolean {
  const rest = text.slice(at, at + 8).trimStart();
  return rest.startsWith("(") || rest.startsWith("(<");
}

/** The kinds of every character of the document, null where nothing was read. */
function kindsOf(text: string, root: Node): (DiffTokenKind | null)[] {
  const kinds: (DiffTokenKind | null)[] = new Array<DiffTokenKind | null>(
    text.length,
  ).fill(null);
  let visited = 0;

  const paint = (from: number, to: number, kind: DiffTokenKind): void => {
    for (let i = from; i < to && i < text.length; i++)
      if (kinds[i] === null) kinds[i] = kind;
  };

  const visit = (node: Node): void => {
    if (visited++ > MAX_NODES) return;

    const strong = strongKindOf(node.type);
    if (strong !== null) {
      paint(node.startIndex, node.endIndex, strong);
      return;
    }

    if (node.childCount === 0) {
      const from = node.startIndex;
      const to = node.endIndex;
      if (to <= from) return;
      const kind = leafKindOf(
        node.type,
        text.slice(from, to),
        calledAfter(text, to),
      );
      if (kind !== "plain") paint(from, to, kind);
      return;
    }

    for (const child of node.children) visit(child);
  };

  visit(root);
  return kinds;
}

/**
 * The document split into lines, each line a run per kind.
 *
 * A line is the unit a diff paints, so the kinds are cut at the line breaks: a
 * block comment that crosses ten lines answers with ten comment runs, one for
 * each of the rows it colours.
 */
function linesOf(
  text: string,
  kinds: (DiffTokenKind | null)[],
): DiffToken[][] {
  const out: DiffToken[][] = [];
  let start = 0;

  for (;;) {
    const end = text.indexOf("\n", start);
    const stop = end < 0 ? text.length : end;
    const runs: DiffToken[] = [];
    let i = start;
    while (i < stop) {
      const kind = kinds[i] ?? "plain";
      let j = i + 1;
      while (j < stop && (kinds[j] ?? "plain") === kind) j++;
      runs.push({ text: text.slice(i, j), kind });
      i = j;
    }
    out.push(runs);
    if (end < 0) return out;
    start = end + 1;
  }
}

/**
 * One document, read once: the tokens of every line, in the order the lines
 * stand in the text. Null when the text cannot be read at all.
 */
export async function highlightLines(
  text: string,
  language: GuardrailLanguage,
): Promise<DiffToken[][] | null> {
  if (text === "" || text.length > MAX_DOC_CHARS) return null;

  const key = `${language}:${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const grammar = await loadGrammar(language);
  if (grammar === null) return null;

  const parser = parserFor(language);
  parser.setLanguage(grammar);
  const parsed = parseWithinBudget(parser, text);
  const tree = parsed.tree;
  if (tree === null) return null;

  const lines = linesOf(text, kindsOf(text, tree.rootNode));
  tree.delete();

  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(key, lines);
  return lines;
}
