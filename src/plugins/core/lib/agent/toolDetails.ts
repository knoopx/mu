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

/**
 * The call's answer, read as the shape its own plugin declares for it.
 *
 * This is the one place a view is allowed to stop checking the shape and start
 * naming fields, and it is worth it: it is what puts the field *names* under the
 * typechecker. A view that reads `details["commit_count"]` through a bare record
 * cannot be told the field is now called something else, and the row quietly
 * falls back to the tool's own text; a view that reads `details.commit_count`
 * off a `VcsLogDetails` fails the build instead. What stays honest is the
 * coercion — every field is still read through one of the readers below, so a
 * session file from an older build paints an absent field rather than a lie.
 */
export const detailsAs = <D>(details: unknown): D | null => {
  const record = detailRecord(details);
  return record === null ? null : (record as unknown as D);
};

/** A field that should read as text, or the fallback its column would show. */
export const detailText = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

/** A figure, or nothing: a field that is not a number is a field with no figure in it. */
export const detailNumber = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

/** A figure the call may have left out — where the figure holds null, not 0. */
export const detailOptionalNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/** A flag, with the default the widget would have drawn had the call said nothing. */
export const detailFlag = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

/**
 * One of a fixed vocabulary of state words.
 *
 * A status the tool did not write, or wrote wrong, is the fallback — which for
 * a view is usually "this is not an answer of mine", so the caller can name the
 * word it means by `fallback: null`.
 */
export const detailWord = <W extends string>(
  value: unknown,
  words: readonly W[],
  fallback: W | null = null,
): W | null =>
  typeof value === "string" && (words as readonly string[]).includes(value)
    ? (value as W)
    : fallback;

/** A table of rows, or nothing when the field is not an array. */
export const detailList = <T>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

/** A list of words, dropping anything a JSON answer turned into something else. */
export const detailStrings = (value: unknown): string[] =>
  detailList<unknown>(value).filter(
    (entry): entry is string => typeof entry === "string",
  );
