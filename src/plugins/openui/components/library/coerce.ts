/**
 * Reading one reactive prop as the shape it is declared to be.
 *
 * A program writes what it means and sometimes gets the shape wrong — `$seats =
 * "12"` for a slider, `$on = "true"` for a switch — and a query can answer with
 * the string form of a number. The rule the reference plugin applies is that a
 * value that converts without loss is read as the type the input needs rather
 * than turning the whole control into an error; a value that cannot convert is
 * the fallback, which is what the component says when the program gave it
 * nothing.
 *
 * The fallback decides which of the four shapes is asked for, and each shape has
 * its own reader: an input's number is not read the way its list is.
 */

const numeric = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** A number, from the digits a program or a query wrote for it. */
const asNumber = (value: unknown, fallback: number): number => {
  const taken = numeric(value);
  return taken === null ? fallback : taken;
};

/** A switch's state: the words a program writes for on and off, in either case. */
const asBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1 || value === "1") return true;
  if (value === "false" || value === 0 || value === "0") return false;
  return fallback;
};

/** A list: one value named where the prop declares a list is a list of one. */
const asList = (
  value: unknown,
  fallback: readonly unknown[],
): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "")
    return fallback as unknown[];
  return [value];
};

/** Text: a number or a boolean prints, and anything else is the fallback. */
const asString = (value: unknown, fallback: string): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return fallback;
};

/** Anything else: what the program wrote, unless it wrote nothing. */
const asGiven = (value: unknown, fallback: unknown): unknown =>
  value === undefined || value === null ? fallback : value;

export function coerce<Value>(value: unknown, fallback: Value): Value {
  if (typeof fallback === "number")
    return asNumber(value, fallback) as Value;
  if (typeof fallback === "boolean")
    return asBoolean(value, fallback) as Value;
  if (Array.isArray(fallback))
    return asList(value, fallback as readonly unknown[]) as Value;
  if (typeof fallback === "string")
    return asString(value, fallback) as Value;
  return asGiven(value, fallback) as Value;
}
