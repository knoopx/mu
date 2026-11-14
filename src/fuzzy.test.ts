import { describe, expect, test } from "bun:test";

import { fuzzyFilter, fuzzyMatch } from "./fuzzy";

const found = (query: string, text: string): number => {
  const match = fuzzyMatch(query, text);
  expect(match.matches).toBe(true);
  return match.score;
};

describe("fuzzyMatch", () => {
  test("an exact name beats a prefix of the same length", () => {
    const exact = found("src", "src");
    const prefix = found("src", "src/plugins/registry.ts");
    expect(exact).toBeLessThan(prefix);
  });

  test("a run of consecutive characters is worth more than the same letters scattered", () => {
    expect(found("reg", "registry")).toBeLessThan(
      found("reg", "read-every-guideline"),
    );
  });

  test("a character at the start of a word is worth more than one inside it", () => {
    expect(found("name", "file-name")).toBeLessThan(found("name", "filename"));
  });

  test("an earlier find is worth more than a later one", () => {
    expect(found("ab", "abracadabra")).toBeLessThan(found("ab", "zzzzzab"));
  });

  test("a query the text does not hold in order does not match", () => {
    expect(fuzzyMatch("za", "abracadabra").matches).toBe(false);
    expect(fuzzyMatch("abc", "ab").matches).toBe(false);
  });

  test("the same query with its letters and digits the other way round still reaches", () => {
    expect(fuzzyMatch("usb3", "usb 3 cable").matches).toBe(true);
    expect(fuzzyMatch("3usb", "usb3").matches).toBe(true);
    // …but never ahead of the query as typed.
    const typed = found("usb3", "usb3");
    const swapped = found("usb3", "usb 3");
    expect(swapped).toBeGreaterThan(typed);
  });

  test("an empty query matches everything at no cost", () => {
    expect(fuzzyMatch("", "anything")).toEqual({ matches: true, score: 0 });
  });
});

describe("fuzzyFilter", () => {
  const items = ["changes panel", "commit panel", "composer panel", "projects"];

  test("every token has to land, and one item may hold them in any order", () => {
    expect(fuzzyFilter(items, "panel commit", (item) => item)).toEqual([
      "commit panel",
    ]);
  });

  test("the best find is first, and an empty query leaves the list as it was", () => {
    expect(fuzzyFilter(items, "comp", (item) => item)).toEqual([
      "composer panel",
      "commit panel",
    ]);
    expect(fuzzyFilter(items, "   ", (item) => item)).toEqual(items);
  });

  test("a token nothing holds empties the list", () => {
    expect(fuzzyFilter(items, "panel zebra", (item) => item)).toEqual([]);
  });
});
