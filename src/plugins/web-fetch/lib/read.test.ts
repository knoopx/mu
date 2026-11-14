/**
 * One page read: the cache, the caps, the figures.
 *
 * The browser is taken out (`load`) so the two things this file decides can be
 * graded without a network: that a page is paid for once a day, and that a long
 * page is answered with its opening *and the size of the whole*, which is the only
 * way the model can tell it did not read the end.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "bun:test";

import { fetchWebPage } from "./read";
import { pageTextOf } from "./clean";
import { MAX_PAGE_CHARS, MAX_PREVIEW_LINES } from "../constants";

const HOME = process.env["XDG_CACHE_HOME"];
process.env["XDG_CACHE_HOME"] = mkdtempSync(join(tmpdir(), "mu-webfetch-"));

afterAll(() => {
  if (HOME === undefined) delete process.env["XDG_CACHE_HOME"];
  else process.env["XDG_CACHE_HOME"] = HOME;
});

const counting = (page: string) => {
  let calls = 0;
  return {
    calls: () => calls,
    load: async () => {
      calls += 1;
      return page;
    },
  };
};

describe("fetchWebPage", () => {
  test("a page is fetched once and kept for the rest of the day", async () => {
    const page = counting("# Nushell\n\nopen ./cities.csv | first 5");

    const first = await fetchWebPage({
      url: "example.com/one",
      load: page.load,
    });
    const second = await fetchWebPage({
      url: "example.com/one",
      load: page.load,
    });

    expect(page.calls()).toBe(1);
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.page).toBe(first.page);
    expect(second.host).toBe("example.com");
  });

  test("a fragment on the end is the same page, not a second fetch", async () => {
    const page = counting("# Pricing\n\nannual is cheaper");

    await fetchWebPage({
      url: "https://example.com/two#annual",
      load: page.load,
    });
    const top = await fetchWebPage({
      url: "https://example.com/two",
      load: page.load,
    });

    expect(page.calls()).toBe(1);
    expect(top.cached).toBe(true);
    expect(top.url).toBe("https://example.com/two");
  });

  test("a page that gave no text is answered as empty and not kept", async () => {
    const page = counting("   \n\n \n");

    const first = await fetchWebPage({
      url: "example.com/three",
      load: page.load,
    });
    const second = await fetchWebPage({
      url: "example.com/three",
      load: page.load,
    });

    expect(first.status).toBe("empty");
    expect(first.chars).toBe(0);
    expect(first.excerpt).toEqual([]);
    expect(page.calls()).toBe(2);
    expect(second.cached).toBe(false);
  });

  test("a long page answers with its opening and says how big it was", async () => {
    const whole = `# Title\n\n${"a line of prose in the document\n".repeat(4_000)}`;

    const read = await fetchWebPage({
      url: "example.com/four",
      load: async () => whole,
    });

    expect(read.status).toBe("ok");
    expect(read.truncated).toBe(true);
    expect(read.page.length).toBeLessThanOrEqual(MAX_PAGE_CHARS);
    expect(read.chars).toBeGreaterThan(MAX_PAGE_CHARS);
    // The count is the cleaned page's, not the dump's: a trailing newline is not
    // a line.
    expect(read.lines).toBe(pageTextOf(whole).split("\n").length);
    expect(read.page.split("\n").length).toBeLessThan(read.lines);
    expect(read.excerpt.length).toBe(MAX_PREVIEW_LINES);
    expect(read.excerpt[0]).toBe("# Title");
  });

  test("a page that could not be read is a failure, not an empty page", async () => {
    await expect(
      fetchWebPage({
        url: "https://no-such-site.invalid/",
        load: async () => {
          throw new Error("The page could not be read: no route");
        },
      }),
    ).rejects.toThrow("no route");
  });

  test("a URL that is not a page never reaches the browser", async () => {
    const page = counting("never read");

    await expect(
      fetchWebPage({ url: "file:///etc/hosts", load: page.load }),
    ).rejects.toThrow(/local file/);
    expect(page.calls()).toBe(0);
  });
});
