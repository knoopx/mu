/**
 * The answer side of a codemode row.
 *
 * pi opens a script's result with `Script completed` / `Wall time …` /
 * `Output:` and puts what the script printed after it. pi's own renderer drops
 * that header and states the wall time as a timing line instead, and the log
 * follows it: the header is a wrapper around the output, not part of it.
 */

/** pi writes the wall time with one decimal, so the header is matched, not guessed at. */
const SCRIPT_HEADER =
  /^Script (?:completed|failed)\nWall time ([\d.]+) seconds\nOutput:\n+/;

export interface CodemodeAnswer {
  /** what the script printed, without pi's header */
  body: string;

  /** how long the script ran, in ms, or null when the answer carries no header */
  tookMs: number | null;
}

export function codemodeAnswerOf(output: string): CodemodeAnswer {
  const header = SCRIPT_HEADER.exec(output);
  if (header === null) return { body: output, tookMs: null };

  const seconds = Number.parseFloat(header[1]);
  return {
    body: output.slice(header[0].length),
    tookMs: Number.isFinite(seconds) ? Math.round(seconds * 1000) : null,
  };
}

/** A duration as pi says it: `4.2s` below a minute, then `1m 30s`, then `2h 3m 4s`. */
function codemodeDurationOf(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;

  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  if (minutes < 60) return `${String(minutes)}m ${String(rest)}s`;

  return `${String(Math.floor(minutes / 60))}h ${String(minutes % 60)}m ${String(rest)}s`;
}

/** One call's own duration: pi names a fraction of a second in ms and a whole one in seconds. */
export function codemodeCallDurationOf(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : codemodeDurationOf(ms);
}

/** The row's timing line — the header's wall time, in pi's words. */
export const codemodeTookOf = (tookMs: number | null): string =>
  tookMs === null ? "" : `Took ${codemodeDurationOf(tookMs)}`;
