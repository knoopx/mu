/**
 * Formatting the log's one answer for the values GitHub answers with.
 *
 * GitHub hands back `2026-11-06T18:12:00Z` and `47000` and `+96 -41`. A transcript
 * that prints those verbatim is printing the wire, not a record: a reader cannot
 * compare two dates at a glance and cannot tell which of `812` and `47000` is the
 * bigger project without counting digits. Every value a github row paints goes
 * through here first, so one date is one format across all nine tools and every
 * count is read the same way.
 *
 * The model's table keeps the wire form where the wire form is the fact; this is
 * the human's reading of the same value.
 */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const DAY = 86_400_000;

const parse = (value: string): Date | null => {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  // GitHub answers ISO to the second; a few reads answer "2026-11-06 18:12".
  const iso = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/u.test(trimmed)
    ? trimmed.replace(" ", "T").replace(/ /g, "")
    : trimmed;
  const date = new Date(
    iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`,
  );
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * A date a reader recognises: `6 Nov`, or `6 Nov 2025` when the year is not this
 * one. A day is never printed as eight digits and a clock.
 */
export const humanDate = (value: string, now: Date = new Date()): string => {
  const date = parse(value);
  if (date === null) return value;
  const label = `${String(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]}`;
  return date.getUTCFullYear() === now.getUTCFullYear()
    ? label
    : `${label} ${String(date.getUTCFullYear())}`;
};

/**
 * How long ago, for the handful of places where age is the fact: a commit that
 * landed the other day, an issue that has been open for a fortnight.
 */
export const humanAge = (value: string, now: Date = new Date()): string => {
  const date = parse(value);
  if (date === null) return value;
  const days = Math.round((now.getTime() - date.getTime()) / DAY);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${String(days)} days ago`;
  if (days < 70) return `${String(Math.round(days / 7))} weeks ago`;
  if (days < 365) return `${String(Math.round(days / 30))} months ago`;
  return `${(days / 365).toFixed(days < 730 ? 1 : 0)} years ago`;
};

/** A date and its age together, the way a record is read: when, and how long ago. */
export const humanDated = (value: string, now: Date = new Date()): string => {
  const date = parse(value);
  if (date === null) return value;
  const days = Math.round((now.getTime() - date.getTime()) / DAY);
  return days < 8
    ? `${humanDate(value, now)}, ${humanAge(value, now)}`
    : humanDate(value, now);
};

/**
 * A count in one format across the whole log: grouped under ten thousand, then one
 * figure with a suffix. `47000` and `812` on the same line are two formats, and the
 * reader counts digits to find out which is bigger.
 */
export const humanCount = (value: string): string => {
  if (!/^\d+$/u.test(value.trim())) return value;
  const count = Number(value);
  if (count < 10_000) return count.toLocaleString("en-US");
  if (count < 1_000_000)
    return `${(count / 1000).toFixed(count < 100_000 ? 1 : 0)}k`;
  return `${(count / 1_000_000).toFixed(1)}m`;
};

/** A count with the thing it counts, so `7` becomes `7 replies` and reads as a fact. */
export const humanTally = (
  value: string,
  one: string,
  many: string,
): string => {
  const shown = humanCount(value);
  if (shown === "") return "";
  return `${shown} ${/^\d+$/u.test(value.trim()) && Number(value) === 1 ? one : many}`;
};

/** A change: `+96 −41` typed the way a diff is read, with a real minus. */
export const humanChange = (insertions: number, deletions: number): string =>
  insertions + deletions === 0
    ? "no lines moved"
    : `+${String(insertions)} −${String(deletions)}`;

/** The two halves of a change, for a widget that paints them apart. */
export const changeOf = (
  value: string,
): { insertions: number; deletions: number } => {
  const plus = /\+\s*(\d+)/u.exec(value);
  const minus = /[−-]\s*(\d+)/u.exec(value);
  return {
    insertions: plus === null ? 0 : Number(plus[1]),
    deletions: minus === null ? 0 : Number(minus[1]),
  };
};

/** A person: `Niamh Ní Dhomhnaill (niamh@gpuix.dev)` is a name, not an email. */
export const humanPerson = (value: string): string => {
  const name = /^(.*)\s*\([^)]*\)$/u.exec(value.trim());
  return (name === null ? value : name[1]).trim();
};

/** A branch, shown without the owner prefix GitHub puts on a fork's head. */
export const humanBranch = (value: string): string =>
  value.includes(":") ? value.slice(value.indexOf(":") + 1) : value;
