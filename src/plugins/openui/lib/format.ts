/**
 * How an OpenUI answer reads.
 *
 * A program is a screen, so most of what a tool has to say about one is
 * numbers: statements, components, errors, what is waiting. Those go in the
 * aligned columns core's `toolText` builds, and the sentences stay short. This
 * file is only the wording of those columns — the row painter never reads it,
 * it reads `details`.
 */

import { MAX_STATE_SOURCE_CHARS, MAX_VALUE_ROWS } from "../constants";
import type {
  OpenUIComponentInfo,
  OpenUIDiagnostic,
  OpenUIProgramDetails,
  OpenUIEventRecord,
  OpenUIGroupInfo,
  OpenUIProgramInfo,
  OpenUIQueryInfo,
  OpenUIValueRow,
} from "../types";
import {
  clipText,
  counted,
  moreLine,
  statusTable,
  tableOf,
} from "../../core/lib/agent/toolText";

/** The columns every list of programs reads from. */
export const programTable = (programs: readonly OpenUIProgramInfo[]): string =>
  tableOf(
    programs.map((program) => ({
      name: program.name,
      chars: program.chars,
      statements: program.statements,
      drawn: program.components,
      unresolved: program.unresolved,
      errors: program.errors,
      waiting: program.waiting,
      state: program.streaming
        ? "streaming"
        : program.live
          ? "showing"
          : "idle",
    })),
  );

/** The status line a render or a stream answers with. */
export const programStatusRow = (program: OpenUIProgramInfo): string => {
  const parts = [
    `program ${program.name}`,
    `${String(program.chars)} chars`,
    counted(program.statements, "statement"),
    counted(program.components, "component") + " drawn",
  ];
  if (program.unresolved > 0)
    parts.push(`${String(program.unresolved)} unresolved`);
  if (program.errors > 0) parts.push(`${String(program.errors)} errors`);
  if (program.streaming) parts.push("still streaming");
  if (program.waiting > 0)
    parts.push(`${String(program.waiting)} interactions waiting`);
  return parts.join(" · ");
};

/**
 * The columns a program write answers with.
 *
 * A render and a stream count the same three things about the program they
 * just wrote; `columns` is what only this kind of write counts — a render's
 * `ok`, a stream's `chunk` and whether the program is still open.
 */
export const programWriteHead = (
  details: OpenUIProgramDetails,
  columns: Readonly<Record<string, string | number>> = {},
): string =>
  statusTable({
    program: details.name,
    chars: details.chars,
    statements: details.statements,
    ...columns,
    ...(details.incomplete ? { incomplete: "yes" } : {}),
  });

/** Every rejection of a program, one `code · why` line per row. */
export const diagnosticLines = (
  diagnostics: readonly OpenUIDiagnostic[],
): string =>
  diagnostics
    .map((diagnostic) => `${diagnostic.code} · ${diagnostic.message}`)
    .join("\n");

/** Every rejection of a program as rows: where it was found, its code, its why. */
export const diagnosticTable = (
  diagnostics: readonly OpenUIDiagnostic[],
): string =>
  tableOf(
    diagnostics.map((diagnostic) => ({
      where:
        diagnostic.component === "" ? diagnostic.path : diagnostic.component,
      code: diagnostic.code,
      why: clipText(diagnostic.message, 96),
    })),
  );

/** The library's index: one row per component. */
export const libraryTable = (
  components: readonly OpenUIComponentInfo[],
): string =>
  tableOf(
    components.map((component) => ({
      component: component.name,
      group: component.group,
      args: counted(component.props.length, "arg"),
      takes: clipText(component.props.map((prop) => prop.type).join(" "), 60),
    })),
  );

/** The groups, with what each of them teaches. */
export function groupLines(groups: readonly OpenUIGroupInfo[]): string {
  return groups
    .map((group) => {
      const notes =
        group.notes.length === 0 ? "" : `\n  ${group.notes.join("\n  ")}`;
      return `${group.name}: ${group.components.join(", ")}${notes}`;
    })
    .join("\n\n");
}

/** One component read out: its signature and one line per argument. */
export function componentLines(component: OpenUIComponentInfo): string {
  const args = component.props
    .map(
      (prop) =>
        `  ${prop.name}${prop.required ? "" : "?"}: ${prop.type}${
          prop.required ? "" : "  (optional)"
        }`,
    )
    .join("\n");
  return `${component.signature}\n  ${component.description}\n${args}`;
}

/** The interactions a human produced, oldest first. */
export function eventLines(events: readonly OpenUIEventRecord[]): string {
  return events
    .map((event) => {
      const params =
        event.params === undefined || Object.keys(event.params).length === 0
          ? ""
          : ` ${JSON.stringify(event.params)}`;
      const form =
        event.formName === undefined ? "" : ` form=${String(event.formName)}`;
      return `${event.type} · ${event.message}${params}${form}`;
    })
    .join("\n");
}

/** The `$variable` values as the human left them. */
export const valueTable = (values: readonly OpenUIValueRow[]): string =>
  tableOf(
    values.map((value) => ({ variable: value.name, value: value.value })),
  );

/** What a program's `Query` calls asked for, and whether they got data. */
export const queryLines = (queries: readonly OpenUIQueryInfo[]): string =>
  queries
    .map(
      (query) =>
        `${query.statementId}: Query("${query.tool}") ${query.served ? "served" : "no data served"}`,
    )
    .join("\n");

/** The source an `openui-state` read prints back, cut to what a screen is. */
export function stateSource(source: string): {
  text: string;
  truncated: boolean;
} {
  if (source.length <= MAX_STATE_SOURCE_CHARS)
    return { text: source, truncated: false };
  return {
    text: `${source.slice(0, MAX_STATE_SOURCE_CHARS)}\n… cut`,
    truncated: true,
  };
}

export const valueRows = (values: Record<string, unknown>): OpenUIValueRow[] =>
  Object.entries(values)
    .slice(0, MAX_VALUE_ROWS)
    .map(([name, value]) => ({
      name,
      value:
        typeof value === "string" ? clipText(value, 48) : JSON.stringify(value),
    }));
