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

import { MAX_OUTPUT_LINES } from "../../core/lib/ui/toolOutputMode";

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
const humanAge = (value: string, now: Date = new Date()): string => {
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
/** A person: `Niamh Ní Dhomhnaill (niamh@gpuix.dev)` is a name, not an email. */
export const humanPerson = (value: string): string => {
  const name = /^(.*)\s*\([^)]*\)$/u.exec(value.trim());
  return (name === null ? value : name[1]).trim();
};

/** A branch, shown without the owner prefix GitHub puts on a fork's head. */
export const humanBranch = (value: string): string =>
  value.includes(":") ? value.slice(value.indexOf(":") + 1) : value;

/**
 * A file's text as the log paints it, and the count that says how far it got.
 *
 * The body and the header's count come out of the same two functions, so the line
 * a file stops at is measured once: the body paints the head and says nothing about
 * the rest, and the header's tail is the one place the cut is spoken.
 */
export const FILE_BODY_LINES = MAX_OUTPUT_LINES;

/** The lines of a file's text the log paints — its head, trailing blanks dropped. */
export const fileBodyLines = (content: string): string[] =>
  content.replace(/\s+$/u, "").split("\n").slice(0, FILE_BODY_LINES);

/**
 * How much of a file is on screen: `104 lines` whole, `40 of 104 lines` once the
 * body stops short. The file's own count is GitHub's; the body's line count only
 * stands in when the record did not carry one.
 */
export const fileLengthWord = (content: string, total: string): string => {
  if (content.trim() === "") return "";
  const lines = content.replace(/\s+$/u, "").split("\n").length;
  const wholeField = /^\d+$/u.test(total.trim()) ? Number(total.trim()) : 0;
  const whole = Math.max(wholeField, lines);
  if (whole === 0) return "";
  const shown = Math.min(lines, FILE_BODY_LINES);
  return shown >= whole
    ? `${String(whole)} lines`
    : `${String(shown)} of ${String(whole)} lines`;
};
