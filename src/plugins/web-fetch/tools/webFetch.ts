/**
 * `web-fetch` — one URL, answered as the page.
 *
 * The port of the skill's contract: render it, convert it, cache it for a day, and
 * answer with the text rather than a table about the text. The one thing mu adds is
 * the figures above the page, because a capped page that does not say it is capped
 * is a page the model will summarise as if it had read all of it.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { toolResult } from "../../core/lib/agent/toolText";
import type { PluginTool } from "../../core/lib/plugin/manifest";
import { fetchWebPage } from "../lib/read";
import { pageAnswer } from "../lib/text";
import { FETCH_TOOL_LABEL, FETCH_TOOL_NAME } from "../constants";
import type { WebFetchDetails, WebFetchParams } from "../types";

const Parameters = Type.Object({
  url: Type.String({
    minLength: 1,
    pattern: "^\\s*\\S",
    description:
      "The page to read — any http(s) URL. A bare host with no scheme is taken as https.",
  }),
});

async function executeWebFetch(
  params: WebFetchParams,
  signal?: AbortSignal,
): Promise<AgentToolResult<WebFetchDetails>> {
  const details = await fetchWebPage({ url: params.url, signal });
  return toolResult(pageAnswer(details), details);
}

export const webFetchTool: PluginTool<typeof Parameters, WebFetchDetails> = {
  name: FETCH_TOOL_NAME,
  icon: "public",
  label: FETCH_TOOL_LABEL,
  description:
    "Fetches one URL and answers with the page as clean text: it is rendered first, so a " +
    "site that draws its body with JavaScript still answers with its body, and it is " +
    "converted to text with images reduced to their alt text. A line above the page names " +
    "the URL, its character and line counts, whether the answer was cut, and whether it " +
    "came out of mu's day-long cache. Read-only.",
  promptSnippet: "Fetch one URL and answer with the page as clean text",
  promptGuidelines: [
    "Use web-fetch for the page itself: a URL a search returned, a link the user named, or documentation you were pointed at.",
    "A source with a dedicated reader goes through that reader — a repository, ref, path or PR number is a github-* read, not a fetch.",
    "The page is capped and the answer says so; do not fetch the same URL again in a session (it is cached for a day) and do not crawl a site's index looking for a fact.",
    "A page that answers with no text renders itself with JavaScript — that is an answer, not a timeout. Go back to the snippet or another source.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params, signal) {
    return executeWebFetch(params, signal);
  },
};
