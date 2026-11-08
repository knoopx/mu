/**
 * What mu spends on a snapcompact pass, and where mu's own switch sits.
 *
 * The frame geometry, the shape a reader gets, the provider's image budget, the
 * per-frame token estimate, the reading guide and the PNG encoding are all
 * `@oh-my-pi/snapcompact`'s. mu names only the caps it hands that package, the
 * key the archive is stored under, and the message it rebuilds a replayed
 * history into.
 */

/**
 * The key the frame archive sits under in a compaction entry's `details`.
 *
 * This mirrors `PRESERVE_KEY` in `@oh-my-pi/snapcompact`. mu spells the string
 * out instead of importing the constant because importing *anything* from that
 * package dlopens `@oh-my-pi/pi-natives` — a 128 MB addon whose only job here is
 * rasterizing frames — and reading a resumed session must never need the
 * renderer loaded just to know the name of the key.
 */
export const ARCHIVE_KEY = "snapcompact";

/** The `customType` of the message a replayed archive is rebuilt into. */
export const ARCHIVE_MESSAGE_TYPE = "snapcompact-history";

/**
 * mu's own ceiling on frames per archive.
 *
 * One frame is one page of the archived transcript: at the Anthropic shape a
 * full 1568px page holds ~14k characters and bills ~3.3k tokens, so an archive
 * only stays cheaper than the history it replaced while it stays short. The
 * package clamps any caller ceiling to its own `MAX_FRAMES_DEFAULT`; mu's number
 * is lower and is the one a user's config file may raise or drop.
 */
export const DEFAULT_MAX_FRAMES = 24;

/** mu never plans an archive of zero frames: that is a text-only pass, and pi's
 *  own summarizer already does that better. */
export const MIN_MAX_FRAMES = 1;

/** A ceiling above the package's own is pointless — it clamps to 80 anyway. */
export const MAX_MAX_FRAMES = 80;

/** mu's switch, in mu's own config dir: the user's file, never the project's. */
export const CONFIG_FILE_NAME = "snapcompact.json";

/** Overrides the whole path of that file (a story or a test points it elsewhere). */
export const CONFIG_FILE_ENV = "MU_SNAPCOMPACT_CONFIG";

/** The frame-shape variant to force, where `"auto"` leaves it to the reader. */
export const AUTO_SHAPE = "auto";
