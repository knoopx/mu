/**
 * One page, rendered by the app's headless browser, answered as its text.
 *
 * A page read that dumps the page as markdown and a page read that runs a script
 * against the DOM are the same call: the same browser, the same clock, the same
 * output bound, and the same three ways it fails — the browser is not on the road,
 * the call was cancelled, the browser ran and the page did not answer. `runProgram`
 * owns the child process; this owns the shape both reads share, so each caller
 * keeps only what the page was for and the words it uses when it did not come.
 *
 * The browser is mu's own: a page is rendered before it is read, so a site that
 * draws its body with JavaScript still answers with its body.
 */

import {
  ProgramCancelledError,
  ProgramMissingError,
  runProgram,
} from "./runProgram";
import { firstLine } from "./truncate";

/** The headless browser mu renders a page with. */
export const BROWSER_BIN = "obscura";

/** The browser's own output is bounded before any of it reaches the log. */
export const PAGE_OUTPUT_BYTES = 4_000_000;

/** What the browser does with the page once it has it, as its own arguments. */
export type PageCommand = readonly string[];

/** How one caller words the three ways a page read fails. */
export interface PageWords {
  /** the browser's name is not on the road */
  missing(bin: string): Error;

  /** the call was cancelled, by the user or by the wall clock it was given */
  cancelled(): Error;

  /** the browser ran, and the page did not come back */
  failed(code: number | null, detail: string): Error;
}

export interface PageRead {
  url: string;

  /** `--dump markdown`, `--eval <script>`: what to do with the page */
  command: PageCommand;

  /** what the call was doing, so a timeout or a missing program names the call */
  subject: string;

  words: PageWords;

  bin?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Render one page and answer with what the browser gave back for it. */
export async function readPage({
  url,
  command,
  subject,
  words,
  bin = BROWSER_BIN,
  signal,
  timeoutMs,
}: PageRead): Promise<string> {
  const run = await runProgram({
    command: bin,
    args: ["fetch", url, "--quiet", ...command],
    subject,
    signal,
    timeoutMs,
    maxOutputBytes: PAGE_OUTPUT_BYTES,
  }).catch((error: unknown) => {
    if (error instanceof ProgramMissingError) throw words.missing(bin);
    if (error instanceof ProgramCancelledError) throw words.cancelled();
    throw error;
  });

  if (run.code !== 0) throw words.failed(run.code, firstLine(run.stderr));
  return run.stdout;
}

/** The exit half of a failure, in one wording: a detail when the browser gave one. */
export function pageExitWords(
  label: string,
  code: number | null,
  detail: string,
): string {
  return detail === ""
    ? `${label} (exit ${code ?? "signal"}).`
    : `${label}: ${detail}`;
}
