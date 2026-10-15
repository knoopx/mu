import type {
  DuckDuckGoResult,
  DuckDuckGoStatus,
} from "./lib/duckduckgo/types";

export interface WebSearchParams {
  query: string;
  limit?: number;
}

export interface WebSearchDetails {
  status: DuckDuckGoStatus;

  query: string;

  results: DuckDuckGoResult[];

  count: number;

  elapsedMs: number;
}

export type { DuckDuckGoResult as WebSearchResult };
