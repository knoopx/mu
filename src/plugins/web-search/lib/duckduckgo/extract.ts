import {
  DDG_HTML_ENDPOINT,
  DDG_REDIRECT_HOST,
  DDG_REDIRECT_PARAM,
  DDG_REDIRECT_PATH,
  RESULT_SELECTOR,
  SNIPPET_SELECTOR,
  TITLE_SELECTOR,
} from "./constants";
import type { DuckDuckGoResult } from "./types";

export interface RawSearchResult {
  title?: unknown;
  url?: unknown;
  snippet?: unknown;
}

export function searchUrl(query: string): string {
  return `${DDG_HTML_ENDPOINT}?q=${encodeURIComponent(query.trim())}`;
}

export const EXTRACT_SCRIPT = `(() => {
  const clean = (u) => {
    if (!u) return "";
    try {
      const p = new URL(u, "https://html.duckduckgo.com");
      if (p.hostname === "${DDG_REDIRECT_HOST}" && p.pathname.startsWith("${DDG_REDIRECT_PATH}")) {
        const target = p.searchParams.get("${DDG_REDIRECT_PARAM}");
        if (target) return target;
      }
      return p.href;
    } catch {
      return u;
    }
  };
  return JSON.stringify(
    Array.from(document.querySelectorAll("${RESULT_SELECTOR}")).map((item) => {
      const a = item.querySelector("${TITLE_SELECTOR}");
      return {
        title: a?.textContent?.trim() ?? "",
        url: clean(a?.href ?? ""),
        snippet: item.querySelector("${SNIPPET_SELECTOR}")?.textContent?.trim() ?? "",
      };
    }),
  );
})()`;

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function oneLine(value: string): string {
  return value
    .split(/[\n\r\t]+/)
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .join(" ");
}

export function hostOf(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return "";
  }
}

export function parseResults(stdout: string): RawSearchResult[] {
  const text = stdout.trim();
  if (text === "") return [];
  const start = text.indexOf("[");
  const body = start > 0 ? text.slice(start) : text;
  const parsed: unknown = JSON.parse(body);
  return Array.isArray(parsed) ? (parsed as RawSearchResult[]) : [];
}

export function normalizeResults(
  raw: RawSearchResult[],
  limit: number,
): DuckDuckGoResult[] {
  const seen = new Set<string>();
  const rows: DuckDuckGoResult[] = [];

  for (const entry of raw) {
    const url = textOf(entry.url);
    if (url === "" || seen.has(url)) continue;
    seen.add(url);
    rows.push({
      rank: rows.length + 1,
      title: oneLine(textOf(entry.title)),
      url,
      host: hostOf(url),
      snippet: oneLine(textOf(entry.snippet)),
    });
    if (rows.length >= limit) break;
  }

  return rows;
}
