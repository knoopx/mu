import { stripTerminalSequences } from "./strip";

const ZERO_WIDTH = new Set([0x200b, 0xfe0f, 0x200e, 0x200f]);

/** The codepoints that print two cells wide, in ascending order: Hangul jamo,
 *  the CJK blocks and their compatibility forms, fullwidth forms, and the
 *  ideographs of the first astral plane. A table rather than a chain of ranges
 *  so adding a block is one row, not one more clause of a condition. */
const FULLWIDTH_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x1100, 0x115f],
  [0x2e80, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe30, 0xfe4f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x20000, 0x3fffd],
];

const isFullwidth = (cp: number): boolean =>
  FULLWIDTH_RANGES.some(([first, last]) => cp >= first && cp <= last);

export function visibleWidth(text: string): number {
  let width = 0;
  for (const ch of stripTerminalSequences(text)) {
    const cp = ch.codePointAt(0) ?? 0;
    if (ZERO_WIDTH.has(cp)) continue;
    width += isFullwidth(cp) ? 2 : 1;
  }
  return width;
}
