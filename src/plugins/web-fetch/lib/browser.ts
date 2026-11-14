/**
 * One page, rendered, answered as text.
 *
 * The browser is the same program mu's search runs, and for the same reason: the
 * page is rendered, so a documentation site that draws its body with JavaScript
 * still answers with its body, and `--dump markdown` converts it on the way out.
 * The spawn, the clock and the failure handling are the app's own `readPage`;
 * what lives here is only what a page read asks of it and how this plugin says
 * that a page did not come.
 */

import {
  pageExitWords,
  readPage,
  type PageWords,
} from "../../../utils/pageRead";
import { PAGE_LOAD_TIMEOUT_S, PAGE_READ_TIMEOUT_MS } from "../constants";

const words: PageWords = {
  missing: (bin) =>
    new Error(
      `Reading a page needs the \`${bin}\` headless browser on PATH — install it to enable web-fetch.`,
    ),
  cancelled: () => new Error("The page read was cancelled."),
  failed: (code, detail) =>
    new Error(pageExitWords("The page could not be read", code, detail)),
};

export async function fetchPageText(
  url: string,
  signal?: AbortSignal,
): Promise<string> {
  return readPage({
    url,
    command: ["--dump", "markdown", "--timeout", String(PAGE_LOAD_TIMEOUT_S)],
    subject: "page read",
    words,
    signal,
    timeoutMs: PAGE_READ_TIMEOUT_MS,
  });
}
