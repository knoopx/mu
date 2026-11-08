import { type AdwaitaTheme } from "adwaita-gpuix";
import { ROW_HEIGHT, codeLineBox } from "../ui/tokens";

const MAX_ONE_ROW_CHARS = 120;

export const FIELD_MIN_ROWS = 3;
export const FIELD_MAX_ROWS = 6;

export function composerFieldSize(t: AdwaitaTheme): number {
  return t.type.caption;
}

export function fieldLineBox(t: AdwaitaTheme): number {
  return codeLineBox(t, composerFieldSize(t));
}

export function fieldPadY(t: AdwaitaTheme): number {
  return Math.max(0, Math.round((ROW_HEIGHT - fieldLineBox(t)) / 2));
}

/**
 * The meta pills beside the field answer "what am I talking to" before there is
 * a draft. Once a draft exists the question is asked and the row is yours: the
 * field takes the whole width and the pills step out.
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

export function composerFieldExtraHeight(
  t: AdwaitaTheme,
  value: string,
): number {
  return (composerFieldRows(value) - 1) * fieldLineBox(t);
}
