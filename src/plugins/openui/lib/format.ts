/**
 * How an OpenUI fact is written down.
 *
 * An event's time, a bound value, one long string clipped for a row: the same
 * three shapes are needed by the answer the model reads and the rows the log
 * paints, and they have to agree, so they are said once here.
 */

/** When the human did it, to the second, in the reader's own clock. */
export const clock = (at: number): string =>
  new Date(at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

/** A bound value as one line: strings stay strings, everything else is JSON. */
export const valueText = (value: unknown): string =>
  typeof value === "string" ? value : (JSON.stringify(value) ?? String(value));

/** One line, clipped to what a row can hold. */
export const clip = (text: string, max = 96): string => {
  const flat = text.replace(/\s+/g, " ");
  return flat.length <= max ? flat : `${flat.slice(0, max)}…`;
};

/** A bound value, clipped for a row. */
export const clipValue = (value: unknown): string => clip(valueText(value));
