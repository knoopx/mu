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
 */

const numeric = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function coerce<Value>(value: unknown, fallback: Value): Value {
  if (typeof fallback === "number") {
    const taken = numeric(value);
    return (taken === null ? fallback : taken) as Value;
  }
  if (typeof fallback === "boolean") {
    if (typeof value === "boolean") return value as Value;
    if (value === "true" || value === 1 || value === "1") return true as Value;
    if (value === "false" || value === 0 || value === "0")
      return false as Value;
    return fallback;
  }
  if (Array.isArray(fallback)) {
    if (Array.isArray(value)) return value as Value;
    if (value === null || value === undefined || value === "") return fallback;
    return [value] as Value;
  }
  if (typeof fallback === "string") {
    if (typeof value === "string") return value as Value;
    if (typeof value === "number" || typeof value === "boolean")
      return String(value) as Value;
    return fallback;
  }
  return (value === undefined || value === null ? fallback : value) as Value;
}
