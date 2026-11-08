/**
 * Folding a script's nested calls into the rows the log draws.
 *
 * One row per call, in the order the script made them: the tool it called, the
 * arguments it passed, how long it took, what it cost when it was a model call,
 * and a badge only when the call carries a state — a run that ended `ok` needs
 * no badge to say so.
 */

import type { ToolTranscriptItem } from "../agent/transcriptState";
import { clipText } from "../agent/toolText";
import { codemodeCallDurationOf } from "./answer";
import { codemodeCallsOf, type CodemodeCall } from "./calls";
import type { ToolPaintRow } from "../ui/toolRowPaint";

/** How wide a call's arguments read before the row clips them, as pi clips them. */
const ARGS_MAX = 80;

export interface CodemodeView {
  rows: ToolPaintRow[];

  /** how many calls the script made, or "" when it made none */
  summary: string;

  /** what the script's `models.*` calls cost in total, or "" when only one was priced */
  cost: string;

  /** the file pi wrote an over-long answer to, or "" */
  fullOutputPath: string;
}

const trailingOf = (call: CodemodeCall): string => {
  const parts: string[] = [];
  if (call.durationMs !== null)
    parts.push(codemodeCallDurationOf(call.durationMs));
  if (call.cost !== null) parts.push(codemodeCostOf(call.cost));
  return parts.join(" · ");
};

/** Cents for a whole cent and more, two significant digits for the fractions a classifier call costs. */
function codemodeCostOf(cost: number): string {
  return `$${cost >= 0.01 ? cost.toFixed(2) : cost.toPrecision(2)}`;
}

function modelCostOf(calls: readonly CodemodeCall[]): string {
  const priced = calls.filter((call) => call.cost !== null);
  if (priced.length <= 1) return "";
  const total = priced.reduce((sum, call) => sum + (call.cost ?? 0), 0);
  return `Model calls: ${codemodeCostOf(total)}`;
}

function rowOf(call: CodemodeCall, index: number): ToolPaintRow {
  const args =
    call.error !== "" && call.args === "" ? call.error : clipText(call.args, ARGS_MAX);

  return {
    key: String(index + 1),
    primary: call.name,
    secondary: args,
    badge: call.status === "ok" ? "" : call.status,
    tone:
      call.status === "error"
        ? "bad"
        : call.status === "running"
          ? "accent"
          : "neutral",
    trailing: trailingOf(call),
    members: call.error === "" || args === call.error ? [] : [call.error],
  };
}

export function codemodeViewOf(item: ToolTranscriptItem): CodemodeView {
  const { calls, fullOutputPath } = codemodeCallsOf(item.details);
  const made = calls.length;

  return {
    rows: calls.map(rowOf),
    summary:
      made === 0 ? "" : `${String(made)} ${made === 1 ? "call" : "calls"} made`,
    cost: modelCostOf(calls),
    fullOutputPath,
  };
}
