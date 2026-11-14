/**
 * A read mu kept to avoid doing it again.
 *
 * A GitHub read, a web page, an arxiv abstract: all of them are facts about
 * something public that do not move inside a working session, so mu keeps the
 * answer under `$XDG_CACHE_HOME/mu/<namespace>/`, keyed by a hash of what was
 * asked, and drops it once it is older than its own ttl. A cache file is never the
 * reason a call fails — an unreadable or half-written one is simply a miss, and a
 * failed write is silent.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { muCacheDir } from "./paths";

/** One kept read: when it was taken, and what came back. */
export interface CacheEntry<T> {
  at: number;
  value: T;
}

/** The scope is whatever identifies the read — a URL, a path, a query string. */
const fileFor = (namespace: string, scope: string): string =>
  join(
    muCacheDir(),
    namespace,
    `${createHash("sha256").update(scope).digest("hex")}.json`,
  );

export async function readCache<T>(
  namespace: string,
  scope: string,
  ttlMs: number,
): Promise<CacheEntry<T> | null> {
  try {
    const raw = await readFile(fileFor(namespace, scope), "utf8");
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (typeof entry?.at !== "number" || entry.value === undefined) return null;
    if (Date.now() - entry.at > ttlMs) return null;
    return entry;
  } catch {
    return null;
  }
}

/** A cache write is never the reason a call fails, so its failure is silent. */
export async function writeCache<T>(
  namespace: string,
  scope: string,
  value: T,
): Promise<void> {
  try {
    await mkdir(join(muCacheDir(), namespace), { recursive: true });
    await writeFile(
      fileFor(namespace, scope),
      JSON.stringify({ at: Date.now(), value }),
      "utf8",
    );
  } catch {}
}
