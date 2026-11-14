/**
 * web-search — one tool over one engine.
 *
 * One header: the query and how many hits came back, and under it the ranked list.
 * Nothing repeats the count above the hits, and a search that found nothing is that
 * header line with no plate under it.
 */

import { definePlugin } from "../core/lib/plugin/manifest";
import { webSearchTool } from "./tools/webSearch";
import {
  isSearchTool,
  searchHasBody,
  searchPreviewOf,
  SearchResults,
} from "./components/SearchResults";

export const webSearchPlugin = definePlugin(
  "web-search",
  {
    title: "Web search",
    summary: "Ranked organic results, every URL a direct link to the page.",
    icon: "search",
    category: "agent",
  },
  (app) => {
    app.tools.register(webSearchTool);

    app.log.rows({
      key: "search",
      owns: isSearchTool,
      // A search that found nothing is its header line and no plate.
      body: (item) =>
        searchHasBody(item) ? <SearchResults item={item} /> : null,
      preview: searchPreviewOf,
    });
  },
);
