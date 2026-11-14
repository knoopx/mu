/**
 * The calls a codemode script made.
 *
 * A script reaches the app's tools through pi's own tool pipeline, so those
 * calls never become tool calls of their own in the transcript: pi records them
 * on the script's result as `details.calls` and shows them inside its row. The
 * log does the same, which is why the transcript's event mapping drops a
 * `tool_execution_*` event that carries a `parentToolCallId`.
 */

export type CodemodeCallStatus = "running" | "ok" | "error" | "cancelled";

export interface CodemodeCall {
  /** the tool the script called */
  name: string;

  /** its arguments as pi previews them — one line, already clipped */
  args: string;

  status: CodemodeCallStatus;

  durationMs: number | null;

  /** what a `models.*` call cost, in dollars; null for a tool call */
  cost: number | null;

  /** the failure pi kept for an errored call */
  error: string;
}

export interface CodemodeCalls {
  calls: CodemodeCall[];

  /** where pi spilled an over-long answer to a file, so the log can name it */
  fullOutputPath: string;
}

const STATUSES: readonly CodemodeCallStatus[] = [
  "running",
  "ok",
  "error",
  "cancelled",
];

const statusOf = (value: unknown): CodemodeCallStatus =>
  STATUSES.find((status) => status === value) ?? "ok";

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

function callOf(record: Record<string, unknown>): CodemodeCall {
  return {
    name: asString(record.name),
    args: asString(record.args),
    status: statusOf(record.status),
    durationMs: asNumber(record.durationMs),
    cost: asNumber(record.cost),
    error: asString(record.error),
  };
}

export function codemodeCallsOf(details: unknown): CodemodeCalls {
  if (typeof details !== "object" || details === null)
    return { calls: [], fullOutputPath: "" };

  const records = (details as { calls?: unknown }).calls;
  return {
    calls: Array.isArray(records)
      ? records
          .filter(
            (call): call is Record<string, unknown> =>
              typeof call === "object" && call !== null,
          )
          .map(callOf)
      : [],
    fullOutputPath: asString(
      (details as { fullOutputPath?: unknown }).fullOutputPath,
    ),
  };
}
