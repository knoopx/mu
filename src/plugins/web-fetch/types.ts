/**
 * What a page read is pointed at, and what it answers with.
 *
 * The details are what the log paints and are never shown to the model: the model
 * gets the page, the log gets the figures and the opening lines.
 */

/** A read that came back with no text is a real answer, not a failure. */
export type WebFetchStatus = "ok" | "empty";

export interface WebFetchParams {
  url: string;
}

export interface WebFetchTarget {
  /** the URL as it was asked for, with any fragment dropped */
  url: string;
  host: string;
}

export interface WebFetchDetails extends WebFetchTarget {
  status: WebFetchStatus;

  /** the page text, after conversion and capping: what the model was given */
  page: string;

  /** the page's own character and line counts, before the cap */
  chars: number;
  lines: number;

  /** the page ran past `MAX_PAGE_CHARS` and the answer carries its opening */
  truncated: boolean;

  /** the answer came out of mu's own cache rather than off the network */
  cached: boolean;

  /** the opening lines of the page, for the row to quote */
  excerpt: string[];

  elapsedMs: number;
}
