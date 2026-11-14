import { type AdwaitaTheme } from "adwaita-gpuix";
import { ROW_HEIGHT, codeLineBox } from "../ui/tokens";

const MAX_ONE_ROW_CHARS = 120;

const FIELD_MIN_ROWS = 3;
export const FIELD_MAX_ROWS = 6;

export function composerFieldSize(t: AdwaitaTheme): number {
  return t.type.caption;
}

export function fieldLineBox(t: AdwaitaTheme): number {
  return codeLineBox(t, composerFieldSize(t));
}

/**
 * How far one line of the field breathes inside a row's height. Floored, so a
 * one-row field plus its breathing stays inside `ROW_HEIGHT` rather than
 * spilling a pixel past the row every one-line row of the app is built on.
 */
export function fieldPadY(t: AdwaitaTheme): number {
  return Math.max(0, Math.floor((ROW_HEIGHT - fieldLineBox(t)) / 2));
}

/** What the field costs a panel for its first row: one line and its breathing. */
export function fieldFirstRowHeight(t: AdwaitaTheme): number {
  return fieldLineBox(t) + 2 * fieldPadY(t);
}

/**
 * Whether anything has been typed.
 *
 * The meta pills beside the field answer "what am I talking to" before there is
 * a draft. Once a draft exists the question is asked and the row is yours: the
 * field takes the whole width and the pills step out. The same blankness makes
 * Enter inert — a draft of nothing but whitespace has no message to send.
 */
export function draftIsBlank(value: string): boolean {
  return value.trim().length === 0;
}

export function fitsOneRow(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.includes("\n")) return false;
  return trimmed.length <= MAX_ONE_ROW_CHARS;
}

export function composerFieldRows(value: string): number {
  if (fitsOneRow(value)) return 1;
  const wrapped = value
    .split("\n")
    .reduce(
      (lines, part) =>
        lines + Math.max(1, Math.ceil(part.length / MAX_ONE_ROW_CHARS)),
      0,
    );
  return Math.max(FIELD_MIN_ROWS, Math.min(FIELD_MAX_ROWS, wrapped));
}

/** What the field costs a panel beyond its first row. */
export function composerFieldExtraHeight(
  t: AdwaitaTheme,
  value: string,
): number {
  return (composerFieldRows(value) - 1) * fieldLineBox(t);
}
