/**
 * web-fetch — one tool over one page.
 *
 * The row is the page: its URL, its figures, and the opening lines it answered
 * with, in the same words the answer's status row uses.
 */

import { definePlugin } from "../core/lib/plugin/manifest";
import { webFetchTool } from "./tools/webFetch";
import {
  fetchPreviewOf,
  FetchedPage,
  isFetchTool,
} from "./components/FetchedPage";

export const webFetchPlugin = definePlugin(
  "web-fetch",
  {
    title: "Web fetch",
    summary: "Any URL read as the page itself, kept for a day.",
    icon: "public",
    category: "agent",
  },
  (app) => {
    app.tools.register(webFetchTool);

    app.log.rows({
      key: "fetch",
      owns: isFetchTool,
      body: (item) => <FetchedPage item={item} />,
      preview: fetchPreviewOf,
    });
  },
);
