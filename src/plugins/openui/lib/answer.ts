/**
 * The part every openui answer has in common.
 *
 * A openui tool answers the model in aligned columns and the log in structured
 * `details`, and both copies come from the same fields: one status row saying
 * what the call left in the log, then the diagnostics with the hint that
 * clears each one, then what the log holds. Only the body differs per
 * tool, so the head, the error block and the not-found sentences live here.
 */

import {
  blocks,
  counted,
  moreLine,
  partsLine,
  statusTable,
  tableOf,
} from "../../core/lib/agent/toolText";
import { DEFAULT_PROGRAM } from "../constants";
import { hiddenErrors, shownErrors } from "./analysis";
import type { ProgramSnapshot, OpenuiDiagnostic } from "./programStore";
import type { OpenuiReport, OpenuiToolStatus } from "../types";

/** What a call named when it named no program. */
export const programName = (name?: string): string =>
  name === undefined || name.trim() === "" ? DEFAULT_PROGRAM : name.trim();

/** A parse with hard errors is not a failed call: the program is in the log. */
export const reportStatus = (ok: boolean): OpenuiToolStatus =>
  ok ? "ok" : "invalid";

/** One parse report, ready for both readers. */
export function buildReport(
  program: string,
  analysis: {
    ok: boolean;
    statements: number;
    components: string[];
    unresolved: string[];
    incomplete: boolean;
    errors: OpenuiDiagnostic[];
  },
  snapshot: ProgramSnapshot,
  extra: { streaming: boolean; chars: number },
): OpenuiReport {
  return {
    program,
    status: reportStatus(analysis.ok),
    ok: analysis.ok,
    streaming: extra.streaming,
    incomplete: analysis.incomplete,
    statements: analysis.statements,
    components: analysis.components,
    unresolved: analysis.unresolved,
    errors: analysis.errors,
    chars: extra.chars,
    active: snapshot.active,
    programs: snapshot.order,
  };
}

/** the head of every report answer: what the call rendered and how it parsed. */
export const reportHead = (report: OpenuiReport): string =>
  statusTable({
    program: report.program,
    status: report.status,
    statements: report.statements,
    components: report.components.length,
    errors: report.errors.length,
    chars: report.chars,
    streaming: report.streaming ? "yes" : "no",
  });

/** One error per line, each with the move that clears it. */
export const errorBlock = (errors: readonly OpenuiDiagnostic[]): string =>
  errors.length === 0
    ? ""
    : blocks(
        tableOf(
          shownErrors(errors).map((error) => ({
            code: error.code,
            message: error.message,
            hint: error.hint ?? "",
          })),
        ),
        moreLine(hiddenErrors(errors), "error"),
      );

/** The warnings a program answers with but that do not block a render. */
export const warningBlock = (errors: readonly OpenuiDiagnostic[]): string => {
  const warnings = errors.filter((error) => error.severity === "warning");
  return warnings.length === 0
    ? ""
    : warnings.map((error) => `${error.code}: ${error.message}`).join("\n");
};

/** What the log holds after a call, so a program name is never guessed. */
export const programLine = (
  active: string | null,
  programs: readonly string[],
): string =>
  programs.length === 0
    ? "programs: none"
    : `programs: ${programs.join(", ")} · showing ${active ?? programs[0]}`;

/** A program that is not in the log, with the names that are. */
export const unknownProgram = (
  name: string,
  programs: readonly string[],
): string =>
  blocks(
    `no program named "${name}" in the log`,
    programs.length === 0
      ? "no program is rendered yet — render one with openui-render"
      : `in the log: ${programs.join(", ")}`,
  );

/** What `openui-state` says when there is nothing to read. */
export const NO_PROGRAM =
  "no program is rendered yet — render one with openui-render first";

/** The components a program drew, which is how a reader checks the shape it got. */
export const componentLine = (components: readonly string[]): string =>
  components.length === 0 ? "" : `components: ${components.join(", ")}`;

/** What a streamed call received and what the program now totals. */
export const streamLine = (received: number, total: number): string =>
  partsLine(`${counted(received, "char")} received`, `${String(total)} chars total`);

/** Whether the stream is still open, in the words the model acts on. */
export const streamState = (streaming: boolean, incomplete: boolean): string =>
  streaming
    ? incomplete
      ? "streaming: still open, and the source is mid-statement"
      : "streaming: still open — send done: true to close it"
    : "";
