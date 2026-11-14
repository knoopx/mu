/**
 * What a page read says to the model.
 *
 * One line of figures — the URL, how big the page is, how much of it is on the
 * page below, whether it came out of mu's cache — and then the page itself. The
 * figures are not decoration: a capped answer without a note is read as the whole
 * page, which is how a reader ends up certain about the bottom half of a document
 * it never saw.
 */

import { blocks, counted, partsLine } from "../../core/lib/agent/toolText";
import { MAX_PAGE_CHARS } from "../constants";
import type { WebFetchDetails } from "../types";

export function pageAnswer(details: WebFetchDetails): string {
  if (details.status === "empty")
    return [
      `No text came back from ${details.url}.`,
      "The page draws itself with JavaScript, is a file rather than a document, or refused the read — a second attempt here costs a page load and answers the same way, so go back to the search snippet or another source.",
    ].join(" ");

  const head = partsLine(
    details.url,
    counted(details.chars, "character"),
    counted(details.lines, "line"),
    details.truncated ? `first ${String(MAX_PAGE_CHARS)} characters` : "",
    details.cached ? "from cache" : "",
  );

  return blocks(head, details.page);
}
