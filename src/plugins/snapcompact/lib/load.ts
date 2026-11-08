import type * as snapcompactPackage from "@oh-my-pi/snapcompact";

/** The package's own surface, as mu reaches it: names, not pi's fork's types. */
export type Snapcompact = typeof snapcompactPackage;

let loaded: Snapcompact | undefined;
let failed = false;

/**
 * Load `@oh-my-pi/snapcompact`, once.
 *
 * The import is deliberately not at the top of the file. That package's
 * renderer is `@oh-my-pi/pi-natives`, a 128 MB native addon it imports at module
 * scope, so a static import would make mu pay for a rasterizer on every startup —
 * including the sessions whose model takes no images at all, where the pass
 * never runs. Loading it is the first compaction's job, not the window's.
 *
 * A failure sticks: an addon that could not be dlopened once will not be
 * dlopened by the next compaction either, and mu should not reach for 128 MB
 * again on every one. Every caller treats `undefined` as "pi's own summarizer
 * answers this time", which is the same answer a missing grammar gets everywhere
 * else in the app.
 */
export async function loadSnapcompact(): Promise<Snapcompact | undefined> {
  if (loaded !== undefined) return loaded;
  if (failed) return undefined;
  try {
    loaded = (await import("@oh-my-pi/snapcompact")) as Snapcompact;
    return loaded;
  } catch {
    failed = true;
    return undefined;
  }
}
