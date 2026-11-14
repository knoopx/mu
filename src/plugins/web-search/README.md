# web-search — a search that returns links, not a summary

One tool, `search-duckduckgo`. The agent searches the web and gets ranked organic
results — title, URL, snippet — and then reads the page it picked with `read`.

## What you get

- Ranked results with the redirect wrappers unwrapped, so every URL is a direct
  link to the page and can be fed straight to a page read.
- Organic results only: no ads, no sponsored content, no knowledge-panel filler.
- A bounded result set (`limit`, default 10, maximum 20) and a row in the log that
  says what the query was and how many results came back.
- A search that costs one request and no model call, so a wide query is cheap and a
  narrow one is cheaper.

## How it works

`lib/duckduckgo/` is the engine: it builds the query, asks DuckDuckGo's HTML
endpoint through a headless browser context, unwraps each result's redirect, and
returns rows. `tools/webSearch.ts` registers the tool with the mark its row wears;
`components/SearchResults.tsx` draws the hit list in the log. The answer the model
gets is the list of links and snippets, because the snippet is a clue and the page
is the evidence — reading the page is a separate call the agent chooses to make.

## Bounds

There is no API key and no rate-limit budget: the engine is a scraper, so a query is
kept short and keyword-shaped, and the cap on results is also the cap on how much of
someone's HTML is pulled.
