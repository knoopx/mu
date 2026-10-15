import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { MAX_RESULT_LIMIT } from "../lib/duckduckgo/constants";
import { searchDuckDuckGo } from "../lib/duckduckgo/search";
import { SEARCH_TOOL_LABEL, SEARCH_TOOL_NAME } from "../constants";
import type { WebSearchDetails, WebSearchParams } from "../types";

const SearchParametersSchema = Type.Object({
  query: Type.String({
    minLength: 1,
    pattern: "^\\s*\\S",
    description:
      "Search query string — plain keywords, not a question sentence and not a URL",
  }),
  limit: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: MAX_RESULT_LIMIT,
      description: `How many ranked results to return (default 10, maximum ${MAX_RESULT_LIMIT})`,
    }),
  ),
});

export async function executeWebSearch(
  params: WebSearchParams,
  signal?: AbortSignal,
): Promise<AgentToolResult<WebSearchDetails>> {
  const outcome = await searchDuckDuckGo({
    query: params.query,
    limit: params.limit,
    signal,
  });

  return {
    content: [{ type: "text", text: outcome.text }],
    details: {
      status: outcome.status,
      query: outcome.query,
      results: outcome.results,
      count: outcome.results.length,
      elapsedMs: outcome.elapsedMs,
    },
  };
}

export const webSearchTool: ToolDefinition<
  typeof SearchParametersSchema,
  WebSearchDetails
> = {
  name: SEARCH_TOOL_NAME,
  label: SEARCH_TOOL_LABEL,
  description:
    "Search the web and return ranked results as title, URL and snippet. " +
    "Redirect wrappers are unwrapped, so every URL is a direct link to the target " +
    "page — feed it to a page fetcher to read it. Results are the organic links " +
    "only; no ads, no sponsored content.",
  promptSnippet:
    "Search the web for a query and get ranked titles, URLs and snippets",
  promptGuidelines: [
    "Use search-duckduckgo for general web research, current events, library APIs, error messages and anything not in the repo.",
    "Keep queries short and keyword-shaped (names, terms, error text); a sentence-style query returns weaker results.",
    "Take the URL from a result and fetch that page when the snippet is not enough — do not re-search the same topic with bigger words.",
    "Results are ranked; rank 1 is not ground truth. Cross-check facts that matter against a primary source.",
  ],

  executionMode: "parallel",
  parameters: SearchParametersSchema,

  async execute(_toolCallId, params, signal) {
    return executeWebSearch(params, signal);
  },
};
