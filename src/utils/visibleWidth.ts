import { stripTerminalSequences } from "./strip";

const ZERO_WIDTH = new Set([0x200b, 0xfe0f, 0x200e, 0x200f]);

function isFullwidth(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  );
}

export function visibleWidth(text: string): number {
  let width = 0;
  for (const ch of stripTerminalSequences(text)) {
    const cp = ch.codePointAt(0) ?? 0;
    if (ZERO_WIDTH.has(cp)) continue;
    width += isFullwidth(cp) ? 2 : 1;
  }
  return width;
}
