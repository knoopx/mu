export interface DuckDuckGoResult {
  rank: number;
  title: string;
  url: string;
  host: string;
  snippet: string;
}

export type DuckDuckGoStatus = "ok" | "no-results";

export interface DuckDuckGoOutcome {
  status: DuckDuckGoStatus;
  query: string;
  results: DuckDuckGoResult[];
  text: string;
  elapsedMs: number;
}

export interface DuckDuckGoSearchInput {
  query: string;
  limit?: number;
  signal?: AbortSignal;
}
