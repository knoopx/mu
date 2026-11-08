/**
 * How a program's rows are read.
 *
 * A row may be written as a list of cells (`["09:02", "Issue filed", "", "current"]`)
 * or as an object of named fields (`{at: "09:02", title: "Issue filed", status: "current"}`).
 * The parser accepts both, and every component in this library reads them through
 * the helpers here — one pair, so a list row and an object row can never disagree
 * about which cell is which, and a component that grows an argument grows it in
 * one place.
 *
 * A bare value in a row position is that row's first cell: `["clone", "install"]`
 * is a list of two names, and `"run"` is a row with one.
 */

import type { ProgramStatus } from "../../types";
import { textOf } from "./context";

/** What a component calls one row, in the order it declares its arguments. */
export type RowNames = readonly string[];

/** One cell's text, however it is written: a nested list of cells reads as one phrase. */
export function cellText(value: unknown): string {
  if (Array.isArray(value))
    return value.map((entry) => textOf(entry) ?? "").join(" ");
  return textOf(value) ?? "";
}

/** A cell as a number: a program that writes `"12"` means 12, and one that writes
 *  nothing means 0 rather than `NaN` on the canvas. */
export function numberOf(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

/** The `at`th cell of a row: positional in a list, named in an object. */
export function cellOf(
  row: unknown,
  names: RowNames,
  at: number,
): unknown {
  if (Array.isArray(row)) return row[at];
  if (typeof row === "object" && row !== null)
    return (row as Record<string, unknown>)[names[at] ?? ""];
  return at === 0 ? row : undefined;
}

/** The `at`th cell, as text. A cell that is not text answers null. */
export function textCell(
  row: unknown,
  names: RowNames,
  at: number,
): string | null {
  return textOf(cellOf(row, names, at));
}

/** The `at`th cell, as a number. A cell that is not one answers `fallback`. */
export function numberCell(
  row: unknown,
  names: RowNames,
  at: number,
  fallback = 0,
): number {
  const value = cellOf(row, names, at);
  return value === undefined || value === null ? fallback : numberOf(value);
}

/** The `at`th cell as an array, which is how a tree says what is inside it. */
export function listCell(row: unknown, names: RowNames, at: number): unknown[] {
  const value = cellOf(row, names, at);
  return Array.isArray(value) ? value : [];
}

/**
 * The words a program may use for one state of work.
 *
 * A word is a word: the model writes "complete" as easily as "done", and the
 * screen has to mark the same thing either way. These are the aliases; the
 * states themselves are `ProgramStatus`, and what a state looks like is
 * `lib/theme.ts`.
 */
const STATUS_WORDS: Record<string, ProgramStatus> = {
  done: "done",
  complete: "done",
  completed: "done",
  fixed: "done",
  ok: "done",
  passed: "done",
  closed: "done",
  shipped: "done",
  running: "running",
  active: "running",
  inprogress: "running",
  wip: "running",
  started: "running",
  current: "current",
  now: "current",
  head: "current",
  pending: "pending",
  todo: "pending",
  next: "pending",
  upcoming: "pending",
  planned: "pending",
  open: "pending",
  skipped: "skipped",
  cancelled: "skipped",
  canceled: "skipped",
  wontfix: "skipped",
  dropped: "skipped",
  error: "error",
  failed: "error",
  failing: "error",
  blocked: "error",
  rejected: "error",
};

/** Read a status word, forgiving of spacing and case. */
export function statusOf(
  value: unknown,
  fallback: ProgramStatus,
): ProgramStatus {
  if (typeof value !== "string") return fallback;
  const word = value.toLowerCase().replace(/[\s_-]/g, "");
  return STATUS_WORDS[word] ?? fallback;
}

/** How a row's figures read: a number is printed as written, to one decimal. */
export function figureOf(value: unknown): string {
  if (typeof value === "number")
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  return textOf(value) ?? "";
}

/** Is this text a figure? A column of them is right-aligned and set in mono. */
export const isFigure = (text: string): boolean =>
  /^\s*[+-]?[\d,.]+\s*(%|k|m|ms|s|gb|mb|kb|tokens?|\/\s*m)?\s*$/i.test(text) ||
  /^\s*[$€£¥]\s*[\d,.]+/.test(text);
