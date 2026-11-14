/**
 * What the tool is called, and what one page read may hold.
 *
 * The caps live here because a page is the one answer in this app that can run to
 * a megabyte: `MAX_PAGE_CHARS` is the same body budget `github-file` gives a file,
 * and the log quotes only the opening of what the model was given.
 */

export const FETCH_TOOL_NAME = "web-fetch";

export const FETCH_TOOL_LABEL = "Web Fetch";

/** The headless browser mu renders a page with — the same one search reads with. */
export const OBSURA_BIN = "obscura";

/** Seconds the browser budgets for one page load. */
export const PAGE_LOAD_TIMEOUT_S = 30;

/** Wall-clock budget for the call: the load, the settle and the conversion. */
export const PAGE_READ_TIMEOUT_MS = 60_000;

/** The browser's own output is bounded before any of it reaches the log. */
export const MAX_STDOUT_BYTES = 4_000_000;

/** mu's cache of page reads, under `$XDG_CACHE_HOME/mu/`. */
export const CACHE_NAMESPACE = "webfetch";

/**
 * A page is a fact about a public site, not a live stream: a session that reads a
 * documentation page twice reads it once. A day is the same horizon mu gives a
 * GitHub read.
 */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** How much of a page the answer carries. */
export const MAX_PAGE_CHARS = 20_000;

/** How many lines of the page the log quotes before it says how many there are. */
export const MAX_PREVIEW_LINES = 6;
