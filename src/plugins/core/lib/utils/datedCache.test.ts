/**
 * The day-long read cache.
 *
 * Two things have to be true of it and neither is visible from the caller: an entry
 * older than its own ttl is a miss rather than a wrong answer, and a cache that is
 * broken — missing, half-written, not even JSON — never takes a call down with it.
 */

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "bun:test";

import { readCache, writeCache } from "./datedCache";

const HOME = process.env["XDG_CACHE_HOME"];
const scratch = mkdtempSync(join(tmpdir(), "mu-cache-"));
process.env["XDG_CACHE_HOME"] = scratch;

afterAll(() => {
  if (HOME === undefined) delete process.env["XDG_CACHE_HOME"];
  else process.env["XDG_CACHE_HOME"] = HOME;
});

const DAY_MS = 24 * 60 * 60 * 1000;

describe("readCache / writeCache", () => {
  test("a read written now is read back with its age", async () => {
    await writeCache("probe", "https://example.com/a", { text: "hello" });
    const hit = await readCache<{ text: string }>(
      "probe",
      "https://example.com/a",
      DAY_MS,
    );

    expect(hit?.value.text).toBe("hello");
    expect(typeof hit?.at).toBe("number");
  });

  test("the same scope in another namespace is another entry", async () => {
    await writeCache("other", "https://example.com/a", { text: "elsewhere" });
    const hit = await readCache<{ text: string }>(
      "probe",
      "https://example.com/a",
      DAY_MS,
    );

    expect(hit?.value.text).toBe("hello");
  });

  test("an entry older than its ttl is a miss", async () => {
    // The entry is written by hand so it can be a day and a half old: a cache
    // file is only ever stamped with the moment it was taken.
    const dir = join(scratch, "mu", "stale");
    mkdirSync(dir, { recursive: true });
    const { createHash } = await import("node:crypto");
    const key = createHash("sha256").update("scope").digest("hex");
    const anAgeAgo = Date.now() - DAY_MS - 3_600_000;
    writeFileSync(
      join(dir, `${key}.json`),
      JSON.stringify({ at: anAgeAgo, value: { text: "yesterday" } }),
      "utf8",
    );

    expect(
      await readCache<{ text: string }>("stale", "scope", DAY_MS),
    ).toBeNull();
  });

  test("a scope nobody wrote is a miss", async () => {
    expect(
      await readCache("probe", "https://example.com/never", DAY_MS),
    ).toBeNull();
  });

  test("a file that is not a cache entry is a miss, not a crash", async () => {
    const dir = join(scratch, "mu", "broken");
    mkdirSync(dir, { recursive: true });
    // The file name is the hash of the scope, which is what `readCache` builds too.
    const { createHash } = await import("node:crypto");
    const key = createHash("sha256").update("scope").digest("hex");
    writeFileSync(join(dir, `${key}.json`), "{ not json", "utf8");

    expect(await readCache("broken", "scope", DAY_MS)).toBeNull();
  });
});
