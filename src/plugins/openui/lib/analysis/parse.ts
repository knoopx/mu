/**
 * Reading a program: the parse every tool and every paint goes through.
 *
 * One parser is built from this app's library schema, so what counts as a
 * component, an argument and a type is the same answer for `openui-validate`,
 * for a row's error count and for the screen that draws. A parse is kept with
 * its `ParseResult` because the renderer has to evaluate the tree the parser
 * produced, not re-parse the source to get it.
 */

import { createParser, evaluate, type ParseResult } from "@openuidev/lang-core";

import { ROOT_COMPONENT } from "../../constants";
import type {
  OpenUIDiagnostic,
  OpenUIProgramParse,
  OpenUIQueryInfo,
} from "../../types";
import { librarySchema } from "../schema/library";

const parser = createParser(librarySchema, ROOT_COMPONENT);

/** A parse result, and everything the log says about it. */
export interface ProgramParseOutcome {
  parse: OpenUIProgramParse;
  result: ParseResult;
}

/** The components actually reachable from a tree, in the order they appear. */
export function drawnComponents(root: unknown): string[] {
  const found: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node !== "object" || node === null) return;
    const element = node as {
      type?: unknown;
      typeName?: unknown;
      props?: unknown;
    };
    if (element.type === "element") {
      if (typeof element.typeName === "string") found.push(element.typeName);
      walk(element.props);
      return;
    }
    if (Array.isArray(node)) {
      for (const entry of node) walk(entry);
      return;
    }
    for (const value of Object.values(node as Record<string, unknown>))
      walk(value);
  };
  walk(root);
  return found;
}

const errorWord = (code: string): OpenUIDiagnostic["severity"] =>
  code === "no-root" ? "warning" : "error";

type Ast = Parameters<typeof evaluate>[0];

/** The tool name a `Query("name", …)` call asks for, or "" when it is not a word. */
function queryToolOf(node: unknown): string {
  if (node === null || node === undefined) return "";
  const value = evaluate(node as Ast, { getState: () => null, resolveRef: () => null });
  return typeof value === "string" ? value : "";
}

function queriesOf(result: ParseResult): OpenUIQueryInfo[] {
  return result.queryStatements.map((query) => ({
    statementId: query.statementId,
    tool: queryToolOf(query.toolAST),
    served: false,
  }));
}

/** What a parse answers, in the shape the log and the tools read. */
export function describeParse(result: ParseResult): OpenUIProgramParse {
  const diagnostics: OpenUIDiagnostic[] = result.meta.errors.map((error) => ({
    code: error.code,
    component: error.component,
    path: error.path,
    message: error.message,
    severity: errorWord(error.code),
  }));

  const hard = diagnostics.filter((row) => row.severity === "error");

  return {
    ok: result.root !== null && hard.length === 0,
    incomplete: result.meta.incomplete,
    statements: result.meta.statementCount,
    components: drawnComponents(result.root),
    unresolved: result.meta.unresolved,
    orphaned: result.meta.orphaned,
    diagnostics,
    variables: result.stateDeclarations,
    queries: queriesOf(result),
  };
}

/** Parse a whole source in one pass. */
export function parseProgram(source: string): ProgramParseOutcome {
  const result = parser.parse(source);
  return { parse: describeParse(result), result };
}

/** Parse a source that is still arriving: the same parser, told it is partial. */
export function parseStreaming(source: string): ProgramParseOutcome {
  const result = parser.parse(source);
  const parse = describeParse(result);
  return {
    parse: { ...parse, incomplete: result.meta.incomplete || parse.incomplete },
    result,
  };
}

/** Whether a source names the root statement the language insists on. */
export function declaresRoot(source: string): boolean {
  return source.split("\n").some((line) => /^\s*root\s*=/.test(line));
}
