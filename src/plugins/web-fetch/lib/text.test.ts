/**
 * What a page read says to the model.
 *
 * The page is the answer, but the line above it is what keeps the answer honest:
 * how big the page was, how much of it is on screen, and whether mu already had it.
 */

import { describe, expect, test } from "bun:test";

import { pageAnswer } from "./text";
import { MAX_PAGE_CHARS } from "../constants";
import type { WebFetchDetails } from "../types";

const read = (over: Partial<WebFetchDetails> = {}): WebFetchDetails => ({
  url: "https://docs.nushell.sh/book/loading_data.html",
  host: "docs.nushell.sh",
  status: "ok",
  page: "# Loading data\n\nopen ./cities.csv | first 5",
  chars: 4_812,
  lines: 96,
  truncated: false,
  cached: false,
  excerpt: ["# Loading data", "open ./cities.csv | first 5"],
  elapsedMs: 640,
  ...over,
});

describe("pageAnswer", () => {
  test("names the URL and the page's figures above the page", () => {
    const answer = pageAnswer(read());
    const [head, ...rest] = answer.split("\n\n");

    expect(head).toBe(
      "https://docs.nushell.sh/book/loading_data.html · 4812 characters · 96 lines",
    );
    // The page keeps its own blank lines, so the body is everything the head
    // does not cover.
    expect(rest.join("\n\n")).toBe(read().page);
  });

  test("a capped page says it is capped", () => {
    const answer = pageAnswer(
      read({ page: "x".repeat(MAX_PAGE_CHARS), truncated: true, chars: 90_000 }),
    );
    expect(answer).toContain(`first ${String(MAX_PAGE_CHARS)} characters`);
    expect(answer).toContain("90000 characters");
  });

  test("a cached read says the page did not cost a fetch", () => {
    expect(pageAnswer(read({ cached: true }))).toContain("from cache");
    expect(pageAnswer(read({ cached: false }))).not.toContain("from cache");
  });

  test("a page that gave no text is answered in words, not with a blank", () => {
    const answer = pageAnswer(read({ status: "empty", page: "", chars: 0, lines: 0 }));
    expect(answer).toContain("No text came back");
    expect(answer).toContain("https://docs.nushell.sh/book/loading_data.html");
    expect(answer).not.toContain("\n\n");
  });
});
