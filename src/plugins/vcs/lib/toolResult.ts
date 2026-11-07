/**
 * One answer, two readers.
 *
 * A vcs call hands the model aligned-column text and the log structured
 * `details`: the same fact twice, once for reading and once for painting.
 * This file is where that split is decided, so no tool builds a table by
 * hand and nothing in the GUI has to pull a sentence back apart.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";

import { reportTable } from "../../guardrails/lib/report";
import { NOT_A_JJ_REPO } from "./ops";
import type { VcsToolStatus } from "../types";

/** The only shape a vcs tool returns: text for the model, details for the log. */
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

/** The resolved identities and the status, in a table of their own above the data. */
export const statusTable = (cells: Record<string, string | number>): string =>
  tableOf([cells]);

/** A missing parameter is named the same way by all ten tools. */
export const missing = (name: string): string =>
  `missing required parameter: ${name}`;

/** No repo above the working copy: details still come back, with the reason the log will show. */
export const unsupported = (
  status: VcsToolStatus,
  details: Record<string, unknown>,
): Record<string, unknown> => ({
  ...details,
  status,
  error: NOT_A_JJ_REPO,
});

/** An outcome widened to the one status vocabulary the transcript can paint. */
export const statusOf = (outcome: { status: string }): VcsToolStatus =>
  outcome.status as VcsToolStatus;
