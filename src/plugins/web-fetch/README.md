# web-fetch — a URL, answered as the page

One tool, `web-fetch`. The agent points it at a URL and gets the page back as
text — rendered, converted, cached for a day.

## What you get

- The page's own text, not a summary of it: the browser renders the URL, the dump
  is markdown, and images come back as the alt text they were standing in for.
- A page that draws itself with JavaScript still answers with its body, because the
  URL is rendered rather than fetched as bytes.
- One honest line above the page: the URL, its character and line counts, whether
  the answer was cut at the cap, and whether it came out of mu's cache. A capped
  answer that does not say so is read as a whole page.
- A day-long cache keyed by the URL, so a documentation page read twice in a session
  is paid for once.
- A row in the log that quotes the page's opening, names the host, and opens the URL
  in the desktop's browser when a human wants to read it too.

## How it works

`lib/target.ts` decides what may be fetched at all and drops the fragment, because a
section of a page is the same cached page as its top. `lib/browser.ts` asks the same
headless browser mu's search runs — `obscura fetch … --dump markdown` — and the spawn
itself (the clock, the cancellation, the output bound) is the app's own
`runProgram`, not a copy of it. `lib/clean.ts` turns the dump into text and spends the
character budget on the opening; `lib/read.ts` is the one reader, cache first;
`lib/text.ts` is the answer. `tools/webFetch.ts` registers the tool with the mark its
row wears and `components/FetchedPage.tsx` draws the row.

The cache is `core/lib/utils/datedCache.ts` — the same sha256-keyed, day-old-dropped
file store GitHub's reads use, under `$XDG_CACHE_HOME/mu/webfetch/`, and a failed
cache write is silent because it is never the reason a call fails.

## Bounds

`http` and `https` only: a local file goes through `read`, and the tool says so rather
than trying. A page is answered with at most `MAX_PAGE_CHARS` of its opening — the
same budget a GitHub file body gets — and `web-fetch` is not a crawler: it reads the
one URL it was given, and a source with a dedicated reader (a repository, a ref, a
pull request) goes through that reader instead. There is no API key and no budget: the
browser is a scraper, so a page that refuses the read stays refused.
