/**
 * The web, read: a search's hit list and a page's text.
 *
 * A search row has to let the reader tell eight sources apart at a glance — the
 * rank, the title, the host the answer came from. A page row has to let them tell
 * a capped read from a failed one, because both look like silence in an answer.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { releaseAll } from "../harness";
import { ink, logScene } from "../stage/log";
import {
  EMPTY_SEARCH_ITEM,
  FAILED_SEARCH_ITEM,
  RUNTIME_SEARCH_ITEM,
  WASM_SEARCH_ITEM,
} from "../fixtures/scenes/web-search";
import { PAGE_READ_ITEMS } from "../fixtures/scenes/page-read";

afterEach(releaseAll);

const toolRows = (items: typeof PAGE_READ_ITEMS) =>
  items.filter((item) => item.kind === "tool");

describe("a search, answered", () => {
  test("the header says what was asked and how many came back", async () => {
    const screen = await logScene({ items: [WASM_SEARCH_ITEM] });
    const header = screen.ink(
      "web-tree-sitter dylink.0 custom section tree-sitter-wasm grammar refused",
    );
    expect(header.text).toContain("8 results");
  });

  test("every hit is one row: its rank, its title, and the host it came from", async () => {
    const screen = await logScene({ items: [WASM_SEARCH_ITEM] });
    expect(screen.says("tree-sitter-wasm: loading grammars in a browser")).toBe(
      true,
    );
    expect(screen.says("tree-sitter.github.io —")).toBe(true);
    // The ranks are one column, so a reader can point at "03" and mean it.
    const ranks = ink(screen)
      .filter((entry) => /^0\d$/.test(entry.text))
      .map((entry) => entry.x);
    expect(ranks.length).toBe(8);
    for (const x of ranks) expect(x).toBe(ranks[0]);
  });

  test("the same query asked twice says so, and a search with nothing to say says that too", async () => {
    const cached = await logScene({ items: [RUNTIME_SEARCH_ITEM] });
    expect(cached.words().length).toBeGreaterThan(4);
    cached.unmount();

    const empty = await logScene({ items: [EMPTY_SEARCH_ITEM] });
    expect(empty.says("no results") || empty.says("empty")).toBe(true);
    empty.unmount();

    const failed = await logScene({ items: [FAILED_SEARCH_ITEM] });
    expect(failed.says("failed") || failed.says("could not be read")).toBe(
      true,
    );
  }, 20_000);
});

describe("a page, read", () => {
  test("the host, the size and what the log left out ride the header", async () => {
    const screen = await logScene({ items: [toolRows(PAGE_READ_ITEMS)[0]!] });
    const header = screen.ink(
      "docs.rs · 886 characters · 23 lines · … 17 more lines not shown",
    );
    expect(header.text).toContain("886 characters");
    expect(header.text).toContain("17 more lines not shown");
    // The body is the page itself, standing bare under the header.
    expect(
      screen.says(
        "https://docs.rs/photon/latest/photon/imageops/orientation/index.html",
      ),
    ).toBe(true);
    expect(screen.codeMentions("compute_transformed_image")).toBeGreaterThan(0);
  });

  test("a page served out of the day-long cache says it was read from cache", async () => {
    const screen = await logScene({ items: [toolRows(PAGE_READ_ITEMS)[1]!] });
    expect(screen.says("from cache")).toBe(true);
    expect(screen.says("886 characters")).toBe(true);
  });

  test("a page that never answered is marked as one, and keeps its reason", async () => {
    const screen = await logScene({ items: [toolRows(PAGE_READ_ITEMS)[3]!] });
    expect(screen.ink("docs.rs · failed").text).toContain("failed");
    expect(screen.says("Network error: timed out")).toBe(true);
    // Nothing is measured of a page that never arrived.
    expect(screen.says("· 886 characters")).toBe(false);
    expect(screen.says("more lines not shown")).toBe(false);
  });
});
