/**
 * The page as text.
 *
 * An image is only ever worth the text it was standing in for; a page of blank
 * lines is not a page of content; and a cap that lands mid-word reads as a bug,
 * so the cut goes back to a line break when one is nearby.
 */

import { describe, expect, test } from "bun:test";

import { capPage, pageTextOf } from "./clean";
import { MAX_PAGE_CHARS } from "../constants";

describe("pageTextOf", () => {
  test("keeps an image's alt text and drops its address", () => {
    expect(
      pageTextOf("Before ![the window's header](https://x/head.png) after"),
    ).toBe("Before the window's header after");
  });

  test("keeps a reference-style image's alt text", () => {
    expect(pageTextOf("![a chart][fig-1]\n\n[fig-1]: https://x/chart.png")).toBe(
      "a chart\n\n[fig-1]: https://x/chart.png",
    );
  });

  test("collapses runs of blank lines to one", () => {
    expect(pageTextOf("one\n\n\n\n\ntwo\n\n\n")).toBe("one\n\ntwo");
  });

  test("strips trailing spaces and carriage returns", () => {
    expect(pageTextOf("one  \r\n\r\n\r\ntwo\t")).toBe("one\n\ntwo");
  });

  test("an empty dump is an empty page, not a page of one blank line", () => {
    expect(pageTextOf("   \n\n \n")).toBe("");
  });
});

describe("capPage", () => {
  const page = (chars: number): string => "x".repeat(chars);

  test("a page inside the budget arrives whole", () => {
    const capped = capPage(page(MAX_PAGE_CHARS - 1));
    expect(capped.truncated).toBe(false);
    expect(capped.text.length).toBe(MAX_PAGE_CHARS - 1);
  });

  test("a page past it is cut and the cut is said", () => {
    const capped = capPage(page(MAX_PAGE_CHARS + 5_000));
    expect(capped.truncated).toBe(true);
    expect(capped.text.length).toBeLessThanOrEqual(MAX_PAGE_CHARS);
  });

  test("the cut goes back to a line break when one is near", () => {
    const lines = "the quick brown fox\n".repeat(4_000);
    const capped = capPage(lines);
    expect(capped.truncated).toBe(true);
    expect(capped.text.endsWith("\n")).toBe(false);
    expect(capped.text.split("\n").pop()).toBe("the quick brown fox");
  });
});
