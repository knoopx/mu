/**
 * Reading a tool's `details` back.
 *
 * A tool answer has two readers: aligned text in `content` for the model, and
 * the call's own data in `details` for the log. In a session resumed last week
 * that data is JSON off a file rather than a live object, so every view checks
 * the shape instead of trusting it — and the same three checks are what every
 * view needs, so they are written once here: a field that should hold text, one
 * that should hold a figure, one that should hold a flag.
 *
 * A field that is not what its column says answers as its absence rather than
 * throwing, because a row that cannot be painted should still show the rest of
 * the answer.
 */

/** The details object itself, or nothing when the call answered with a shape that is not one. */
export const detailRecord = (
  details: unknown,
): Record<string, unknown> | null =>
  typeof details === "object" && details !== null && !Array.isArray(details)
    ? (details as Record<string, unknown>)
    : null;

/** A field that should read as text, or the fallback its column would show. */
export const detailText = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

/** A figure, or nothing: a field that is not a number is a field with no figure in it. */
export const detailNumber = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

/** A flag, with the default the widget would have drawn had the call said nothing. */
export const detailFlag = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;
