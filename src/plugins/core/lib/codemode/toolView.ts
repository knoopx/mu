/**
 * Folding a script's nested calls into the lines the row paints.
 *
 * One line per call, in the order the script made them, in the order pi's own
 * renderer states them: how the call ended, the tool it called, the arguments it
 * passed, how long it took, and what it cost when it was a model call. A script
 * that made more calls than the row holds loses the earliest of them and says how
 * many it lost — the tail is the part the answer was built from.
 */

import type { ToolTranscriptItem } from "../agent/transcriptState";
import { clipText } from "../agent/toolText";
import { codemodeCallDurationOf } from "./answer";
import {
  codemodeCallsOf,
  type CodemodeCall,
  type CodemodeCallStatus,
} from "./calls";

/** How wide a call's arguments read before the line clips them, as pi clips them. */
const ARGS_MAX = 80;

/**
 * How many of a script's calls the row paints. A script that maps a tool over
 * twenty things earns twenty lines; the eight it made last are the ones its answer
 * was built from, so the head of the list gives way exactly as pi cuts it.
 */
const MAX_CALL_LINES = 8;

export interface CodemodeCallLine {
  /** how the call ended — the mark and its colour are the row's to paint */
  status: CodemodeCallStatus;

  /** the tool the script called */
  name: string;

  /** its arguments, one line and already clipped */
  args: string;

  /** its duration, and its cost when it was a model call; "" when it had neither */
  figures: string;

  /** the failure it carried, which stands on its own line under the call */
  error: string;
}

export interface CodemodeView {
  /** the calls the row paints, in the order the script made them */
  calls: CodemodeCallLine[];

  /** how many calls fell off the head of the list and are not painted */
  earlier: number;

  /** what the script's `models.*` calls cost in total, or "" when only one was priced */
  cost: string;

  /** the file pi wrote an over-long answer to, or "" */
  fullOutputPath: string;
}

/** Cents for a whole cent and more, two significant digits for the fractions a classifier call costs. */
function codemodeCostOf(cost: number): string {
  return `$${cost >= 0.01 ? cost.toFixed(2) : cost.toPrecision(2)}`;
}

/** One call's trailing figures, in pi's order: how long it ran, then what it cost. */
function figuresOf(call: CodemodeCall): string {
  const parts: string[] = [];
  if (call.durationMs !== null)
    parts.push(codemodeCallDurationOf(call.durationMs));
  if (call.cost !== null) parts.push(codemodeCostOf(call.cost));
  return parts.join(" ");
}

function lineOf(call: CodemodeCall): CodemodeCallLine {
  return {
    status: call.status,
    name: call.name,
    args: clipText(call.args, ARGS_MAX),
    figures: figuresOf(call),
    error: call.error,
  };
}

/** The bill for a script's model calls — one line, because pi prints one line. */
function modelCostOf(calls: readonly CodemodeCall[]): string {
  const priced = calls.filter((call) => call.cost !== null);
  if (priced.length <= 1) return "";
  const total = priced.reduce((sum, call) => sum + (call.cost ?? 0), 0);
  return `Model calls: ${codemodeCostOf(total)}`;
}

export function codemodeViewOf(item: ToolTranscriptItem): CodemodeView {
  const { calls, fullOutputPath } = codemodeCallsOf(item.details);
  const earlier = Math.max(0, calls.length - MAX_CALL_LINES);

  return {
    calls: calls.slice(earlier).map(lineOf),
    earlier,
    cost: modelCostOf(calls),
    fullOutputPath,
  };
}
