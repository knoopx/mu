/**
 * One answer, two readers.
 *
 * Every tool answers the model in aligned-column text and the log in
 * structured `details`: the same fact twice, once for reading and once for
 * painting. This file is where that split is decided, so no plugin builds a
 * table by hand and nothing in the GUI has to pull a sentence back apart.
 * Nothing here knows a tool — the status vocabularies and the wording of a
 * finding belong to the plugin that owns them.
 */

import { isAbsolute, relative } from "node:path";

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";

import { reportTable } from "../../../guardrails/lib/report";

/** The only shape a tool returns: text for the model, details for the log. */
export function toolResult<T>(text: string, details: T): AgentToolResult<T> {
  return { content: [{ type: "text", text }], details };
}

/** Blank-line separated blocks — a status row, a table, a body — the shape the transcript reads. */
export const blocks = (...parts: readonly (string | undefined)[]): string =>
  parts
    .map((part) => part?.trim() ?? "")
    .filter((part) => part.length > 0)
    .join("\n\n");

/** Columns taken from the keys of the first row, so a tool states its fields once and they align. */
export function tableOf(
  rows: readonly Record<string, string | number | boolean | undefined>[],
): string {
  const columns = Object.keys(rows[0] ?? {});
  if (columns.length === 0) return "";
  return reportTable(
    columns,
    rows.map((row) => columns.map((column) => String(row[column] ?? ""))),
  );
}

/** The resolved identities of a call, in a table of their own above the data. */
export const statusTable = (cells: Record<string, string | number>): string =>
  tableOf([cells]);

/** A missing parameter is named the same way by every tool. */
export const missing = (name: string): string =>
  `missing required parameter: ${name}`;

/** What a bounded read left out, in the words that tell the model to raise `limit`. */
export const moreLine = (omitted: number, unit: string): string =>
  omitted <= 0
    ? ""
    : `… ${String(omitted)} more ${omitted === 1 ? unit : `${unit}s`} not shown`;

/** One count and its noun, pluralised the same way everywhere. */
export const counted = (count: number, one: string): string =>
  `${String(count)} ${count === 1 ? one : `${one}s`}`;

/** Counts and labels joined by the transcript's separator, skipping what a call did not have. */
export const partsLine = (...parts: readonly (string | number)[]): string =>
  parts
    .map((part) => String(part).trim())
    .filter((part) => part !== "")
    .join(" · ");

/**
 * The scope a call was pointed at, written the shortest way that is still
 * findable, and `(cwd)` when the call never named one. A path inside the project
 * is written from the project, not from the filesystem root: an absolute path
 * spends the whole of a tool header's one-line budget on directories the reader
 * already stands in, and spends it again in the chip under it.
 */
export const scopeLabel = (
  path: string,
  cwd: string = process.cwd(),
): string => {
  const clean = path.trim();
  if (clean === "") return "(cwd)";
  if (!isAbsolute(clean)) return clean;
  const rel = relative(cwd, clean);
  if (rel === "") return "(cwd)";
  return rel.startsWith("..") || isAbsolute(rel) ? clean : rel;
};

/** A tool header's preview is one line, so it is clipped inside its budget. */
export const clipText = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max)}…`;
