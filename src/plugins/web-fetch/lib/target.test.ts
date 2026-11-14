/**
 * The URL guard: what a page read may be pointed at.
 *
 * The cases are the ones a model actually writes — a host with no scheme, a
 * fragment on the end, a `file://` that should have been a `read`, a sentence
 * passed where a URL was asked for.
 */

import { describe, expect, test } from "bun:test";

import { targetOf } from "./target";

describe("targetOf", () => {
  test("takes a full URL as written", () => {
    expect(targetOf("https://docs.nushell.sh/book/")).toEqual({
      url: "https://docs.nushell.sh/book/",
      host: "docs.nushell.sh",
    });
  });

  test("takes a bare host as https", () => {
    expect(targetOf("docs.nushell.sh")).toEqual({
      url: "https://docs.nushell.sh/",
      host: "docs.nushell.sh",
    });
  });

  test("takes a host with a path, and drops www from the host it names", () => {
    const target = targetOf("www.example.com/a/b?x=1");
    expect(target.url).toBe("https://www.example.com/a/b?x=1");
    expect(target.host).toBe("example.com");
  });

  test("takes localhost on a port", () => {
    expect(targetOf("localhost:8080/status").url).toBe(
      "https://localhost:8080/status",
    );
  });

  test("drops the fragment, because the page is cached whole", () => {
    expect(targetOf("https://example.com/pricing#annual").url).toBe(
      "https://example.com/pricing",
    );
  });

  test("trims the spaces around the call", () => {
    expect(targetOf("  https://example.com  ").url).toBe(
      "https://example.com/",
    );
  });

  test("refuses anything that is not an http(s) page, and says where it goes", () => {
    expect(() => targetOf("file:///etc/hosts")).toThrow(/local file.*read/);
    expect(() => targetOf("ftp://example.com")).toThrow(/not a web page/);
  });

  test("refuses a sentence rather than starting a browser", () => {
    expect(() => targetOf("the nushell book")).toThrow(/spaces/);
    expect(() => targetOf("")).toThrow(/needs a URL/);
    expect(() => targetOf("nushell")).toThrow(/scheme/);
  });
});
