/**
 * The browser page read is a search's page read.
 *
 * One browser, one spawn, one clock: `runProgram` owns the process, and this file
 * only says what the DuckDuckGo engine asks of it — a URL, a DOM script, and the
 * words this plugin uses when the page did not come.
 */

import {
  ProgramCancelledError,
  ProgramMissingError,
  runProgram,
} from "../../../../utils/runProgram";
import { firstLine } from "../../../../utils/truncate";
import { MAX_STDOUT_BYTES, OBSURA_BIN, SEARCH_TIMEOUT_MS } from "./constants";

export class BrowserMissingError extends Error {
  constructor(bin: string) {
    super(
      `The DuckDuckGo engine needs the \`${bin}\` headless browser on PATH — install it to enable search.`,
    );
    this.name = "BrowserMissingError";
  }
}

export class SearchCancelledError extends Error {
  constructor() {
    super("The search was cancelled.");
    this.name = "SearchCancelledError";
  }
}

export interface EvalPageRequest {
  url: string;
  script: string;
  signal?: AbortSignal;
  bin?: string;
  timeoutMs?: number;
}

/** Render one page and answer with what the script returned from its DOM. */
export async function evalPage({
  url,
  script,
  signal,
  bin = OBSURA_BIN,
  timeoutMs = SEARCH_TIMEOUT_MS,
}: EvalPageRequest): Promise<string> {
  const run = await runProgram({
    command: bin,
    args: ["fetch", url, "--quiet", "--eval", script],
    subject: "search",
    signal,
    timeoutMs,
    maxOutputBytes: MAX_STDOUT_BYTES,
  }).catch((error: unknown) => {
    if (error instanceof ProgramMissingError) throw new BrowserMissingError(bin);
    if (error instanceof ProgramCancelledError)
      throw new SearchCancelledError();
    throw error;
  });

  if (run.code !== 0) {
    const detail = firstLine(run.stderr);
    throw new Error(
      detail === ""
        ? `Search failed (exit ${run.code ?? "signal"}).`
        : `Search failed: ${detail}`,
    );
  }

  return run.stdout;
}
