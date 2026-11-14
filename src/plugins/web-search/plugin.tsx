/**
 * web-search — one tool over one engine.
 *
 * The row is the ranked result list; the header says what the query found, in the
 * same words the row's caption uses.
 */

import { definePlugin } from "../core/lib/plugin/manifest";
import { webSearchTool } from "./tools/webSearch";
import {
  isSearchTool,
  searchPreviewOf,
  SearchResults,
} from "./components/SearchResults";

export const webSearchPlugin = definePlugin("web-search", (app) => {
  app.tools.register(webSearchTool);

  app.log.rows({
    key: "search",
    owns: isSearchTool,
    body: (item) => <SearchResults item={item} />,
    preview: searchPreviewOf,
  });
});
