/**
 * The browser page read is a search's page read.
 *
 * One browser, one spawn, one clock: the app's own `readPage` owns the process and
 * the failure handling, and this file only says what the DuckDuckGo engine asks of
 * it — a URL, a DOM script — and the error names the engine's callers catch.
 */

import {
  pageExitWords,
  readPage,
  type PageWords,
} from "../../../../utils/pageRead";
import { SEARCH_TIMEOUT_MS } from "./constants";

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

const words: PageWords = {
  missing: (bin) => new BrowserMissingError(bin),
  cancelled: () => new SearchCancelledError(),
  failed: (code, detail) =>
    new Error(pageExitWords("Search failed", code, detail)),
};

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
  bin,
  timeoutMs = SEARCH_TIMEOUT_MS,
}: EvalPageRequest): Promise<string> {
  return readPage({
    url,
    command: ["--eval", script],
    subject: "search",
    words,
    bin,
    signal,
    timeoutMs,
  });
}
