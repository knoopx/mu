/**
 * One page read: the cache, the browser, the page.
 *
 * The cache holds the page as it came back converted but *before* it was capped,
 * so a second read of a long page gets the same opening rather than whatever a
 * smaller budget had left. A page that answered with nothing is not cached: an
 * empty answer is usually the site having a bad moment, and the next read should
 * be allowed to try again.
 */

import { readCache, writeCache } from "../../core/lib/utils/datedCache";
import { capPage, pageTextOf } from "./clean";
import { fetchPageText } from "./browser";
import { targetOf } from "./target";
import { CACHE_NAMESPACE, CACHE_TTL_MS, MAX_PREVIEW_LINES } from "../constants";
import type { WebFetchDetails, WebFetchTarget } from "../types";

interface CachedPage {
  page: string;
}

/** The opening of the page, for the log: the first lines that say anything. */
function excerptOf(lines: string[]): string[] {
  return lines.filter((line) => line.trim() !== "").slice(0, MAX_PREVIEW_LINES);
}

function settled(
  target: WebFetchTarget,
  page: string,
  cached: boolean,
  elapsedMs: number,
): WebFetchDetails {
  const lines = page === "" ? [] : page.split("\n");
  const capped = capPage(page);

  return {
    ...target,
    status: page === "" ? "empty" : "ok",
    page: capped.text,
    chars: page.length,
    lines: lines.length,
    truncated: capped.truncated,
    cached,
    excerpt: excerptOf(lines),
    elapsedMs,
  };
}

/** How a page's bytes are gotten: the browser by default, a stand-in in a test. */
export type PageLoader = (url: string, signal?: AbortSignal) => Promise<string>;

export interface WebFetchInput {
  url: string;
  signal?: AbortSignal;

  /** the read of the page itself, taken out so the cache and the caps can be graded */
  load?: PageLoader;
}

export async function fetchWebPage({
  url,
  signal,
  load = fetchPageText,
}: WebFetchInput): Promise<WebFetchDetails> {
  const target = targetOf(url);
  const started = Date.now();

  const hit = await readCache<CachedPage>(
    CACHE_NAMESPACE,
    target.url,
    CACHE_TTL_MS,
  );
  if (hit !== null)
    return settled(target, hit.value.page, true, Date.now() - started);

  const page = pageTextOf(await load(target.url, signal));
  // Awaited, not fired and forgotten: the next read of the same URL may arrive
  // before a write does, and then the page is paid for twice.
  if (page !== "")
    await writeCache(CACHE_NAMESPACE, target.url, {
      page,
    } satisfies CachedPage);

  return settled(target, page, false, Date.now() - started);
}
