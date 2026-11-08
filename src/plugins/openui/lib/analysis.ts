/**
 * Reading a program without drawing it.
 *
 * A program is text until the renderer has seen it, so the first thing every
 * openui tool does is parse it against this app's library and answer with what
 * came back: how many statements, which components, which names never
 * resolved, and each error with the hint that fixes it. The parse and the
 * hints live here, shared by the tools that answer the model and by the row
 * that draws the program — one diagnosis, two readers.
 */

import { createParser, type ParseResult, type ValidationError } from "@openuidev/lang-core";
import type { OpenUIError } from "@openuidev/react-lang";

import {
  MAX_DIAGNOSTIC_ROWS,
  MAX_PROGRAM_CHARS,
  MAX_WALK_NODES,
  OPENUI_LIBRARY_TOOL,
} from "../constants";
import { library, librarySchema } from "../components/library/registry";
import type { OpenuiDiagnostic } from "./programStore";

export interface ProgramAnalysis {
  ok: boolean;
  statements: number;
  components: string[];
  unresolved: string[];
  incomplete: boolean;
  errors: OpenuiDiagnostic[];
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** What the agent should call, or write, to clear this error. */
function parseHint(error: ValidationError): string | undefined {
  switch (error.code) {
    case "unknown-component":
      return `${OPENUI_LIBRARY_TOOL} lists every component this app can render.`;
    case "missing-required":
    case "null-required":
    case "type-mismatch":
    case "excess-args":
      return `${OPENUI_LIBRARY_TOOL}({ name: ${JSON.stringify(
        error.component,
      )} }) returns its exact schema.`;
    case "no-root":
      return `Declare the root statement: root = ${library.root ?? "Stack"}([ ... ]).`;
    case "unknown-function":
      return "Only library functions and @builtins (@Count, @Sum, @Set, …) exist.";
    default:
      return undefined;
  }
}

/** One parse error, said the same way to the model and to the log. */
export const parseDiagnostic = (error: ValidationError): OpenuiDiagnostic => {
  const hint = parseHint(error);
  return {
    code: error.code,
    message: error.component
      ? `${error.component}${error.path ?? ""}: ${error.message}`
      : error.message,
    ...(hint === undefined ? {} : { hint }),
  };
};

/** The prop names of a component, for the hint that names what a call left out. */
export function propNames(component: string): string[] {
  const def = library.components[component] as
    | { props?: { shape?: Record<string, unknown> } }
    | undefined;
  const shape = def?.props?.shape;
  return shape ? Object.keys(shape) : [];
}

/** What an argument error needs: the prop it missed, and the signature that shows it. */
function argumentHint(
  code: string,
  component: string,
  path: string | undefined,
): string | undefined {
  const signature = propNames(component).join(", ") || "—";

  if (code === "missing-required" || code === "null-required") {
    const prop = (path ?? "").replace(/^\//, "").split("/")[0];
    return `Pass ${
      prop === "" ? "the required argument" : `"${prop}"`
    } on ${component}(${signature}).`;
  }
  if (code === "type-mismatch")
    return `${component} expects the argument at ${
      path ?? "the head"
    } to match its declared type.`;
  if (code === "excess-args")
    return `Drop the extra argument — ${component}(${signature}).`;
  return undefined;
}

/** How a render-time error is fixed, in the words the agent can act on. */
export function renderHint(
  code: string,
  component: string | undefined,
  path: string | undefined,
): string | undefined {
  if (code === "unknown-component")
    return `${OPENUI_LIBRARY_TOOL} lists every component this app can render.`;
  if (component === undefined) return undefined;

  const argument = argumentHint(code, component, path);
  if (argument !== undefined) return argument;

  if (code === "inline-reserved")
    return `Declare ${component} as its own statement: myValue = ${component}(...).`;
  if (code === "no-root")
    return `Start the program with a root component: root = ${library.root ?? "Stack"}(...).`;
  return undefined;
}

/** One error the renderer hit, with the hint it did not supply itself. */
export const fromOpenUIError = (error: OpenUIError): OpenuiDiagnostic => {
  const where = error.component ?? error.statementId ?? error.source;
  const hint = error.hint ?? renderHint(error.code, error.component, error.path);
  return {
    code: error.code,
    message: `${where}${error.path ?? ""}: ${error.message}`,
    ...(hint === undefined ? {} : { hint }),
  };
};

/** Whether two diagnostics are the same complaint from two readers. */
export const diagnosticKey = (
  code: string,
  component?: string,
  path?: string,
  message?: string,
): string => `${code}|${component ?? ""}|${path ?? ""}|${message ?? ""}`;

const isElementNode = (
  value: unknown,
): value is { typeName: string; props: Record<string, unknown> } => {
  if (typeof value !== "object" || value === null) return false;
  const node = value as { type?: unknown; typeName?: unknown };
  return node.type === "element" && typeof node.typeName === "string";
};

/** Every component a parsed program actually draws, walking the tree once. */
export function walkComponents(root: unknown): string[] {
  const found = new Set<string>();
  const seen = new Set<unknown>();
  let budget = MAX_WALK_NODES;

  const visit = (value: unknown): void => {
    if (budget <= 0) return;
    if (isElementNode(value)) {
      budget -= 1;
      seen.add(value);
      found.add(value.typeName);
      for (const child of Object.values(value.props)) visit(child);
      return;
    }
    if (typeof value !== "object" || value === null || seen.has(value)) return;
    budget -= 1;
    seen.add(value);
    for (const child of Object.values(value)) visit(child);
  };

  visit(root);
  return [...found];
}

/** A name the program mentions but never defines renders as null; that is worth a warning. */
export const unresolvedWarnings = (names: readonly string[]): OpenuiDiagnostic[] =>
  names.map((name) => ({
    code: "unresolved-name",
    message: `${name}: referenced but never defined, so it renders as null`,
    hint: `Arguments are positional — Component(${name} = value) does not bind a prop. Ask ${OPENUI_LIBRARY_TOOL} for the signature; a variable reference needs a $ prefix ($${name}).`,
    severity: "warning",
  }));

export const tooLong = (chars: number): OpenuiDiagnostic => ({
  code: "program-too-long",
  message: `${String(chars)} characters is past the ${String(
    MAX_PROGRAM_CHARS,
  )} an OpenUI program may be`,
  hint: "Send the program in statements with openui-stream, or split the screen into two programs.",
});

/** A parse a renderer would agree with: statements, components, and what is wrong. */
export function analyze(code: string): ProgramAnalysis {
  if (code.length > MAX_PROGRAM_CHARS) {
    return {
      ok: false,
      statements: 0,
      components: [],
      unresolved: [],
      incomplete: false,
      errors: [tooLong(code.length)],
    };
  }

  let result: ParseResult;
  try {
    result = createParser(librarySchema(), library.root).parse(code);
  } catch (error) {
    return {
      ok: false,
      statements: 0,
      components: [],
      unresolved: [],
      incomplete: false,
      errors: [
        {
          code: "parse-exception",
          message: `the OpenUI Lang parser threw: ${messageOf(error)}`,
          hint: "Send a smaller program to openui-validate to isolate the failing statement.",
        },
      ],
    };
  }

  const hard = result.meta.errors.some((entry) => entry.severity !== "warning");
  return {
    ok: !hard,
    statements: result.meta.statementCount,
    components: walkComponents(result.root),
    unresolved: [...result.meta.unresolved],
    incomplete: result.meta.incomplete,
    errors: [
      ...result.meta.errors.map(parseDiagnostic),
      ...unresolvedWarnings(result.meta.unresolved),
    ],
  };
}

/** The diagnostics one answer prints; the rest are counted, not shown. */
export const shownErrors = (
  errors: readonly OpenuiDiagnostic[],
): OpenuiDiagnostic[] => errors.slice(0, MAX_DIAGNOSTIC_ROWS);

export const hiddenErrors = (errors: readonly OpenuiDiagnostic[]): number =>
  Math.max(0, errors.length - MAX_DIAGNOSTIC_ROWS);
