import { DEFAULT_RESULT_LIMIT, MAX_RESULT_LIMIT } from "./constants";
import { evalPage } from "./browser";
import {
  EXTRACT_SCRIPT,
  normalizeResults,
  parseResults,
  searchUrl,
} from "./extract";
import { resultsText } from "./text";
import type { DuckDuckGoOutcome, DuckDuckGoSearchInput } from "./types";

export function clampLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit))
    return DEFAULT_RESULT_LIMIT;
  return Math.min(MAX_RESULT_LIMIT, Math.max(1, Math.floor(limit)));
}

export async function searchDuckDuckGo({
  query,
  limit,
  signal,
}: DuckDuckGoSearchInput): Promise<DuckDuckGoOutcome> {
  const trimmed = query.trim();
  if (trimmed === "") throw new Error("The search query must not be empty.");

  const max = clampLimit(limit);
  const started = Date.now();
  const stdout = await evalPage({
    url: searchUrl(trimmed),
    script: EXTRACT_SCRIPT,
    signal,
  });
  const results = normalizeResults(parseResults(stdout), max);
  const elapsedMs = Date.now() - started;

  return {
    status: results.length === 0 ? "no-results" : "ok",
    query: trimmed,
    results,
    text: resultsText(trimmed, results),
    elapsedMs,
  };
}
