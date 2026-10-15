import { visibleWidth } from "./visibleWidth";

export function singleLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function fitOneLine(text: string, width: number): string {
  return truncateToWidth(singleLine(text), width);
}

export function firstLine(text: string): string {
  return (
    text
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line !== "") ?? ""
  );
}

export function truncateToWidth(
  text: string,
  width: number,
  ellipsis = "\u2026",
): string {
  if (visibleWidth(text) <= width) return text;
  const target = Math.max(0, width - visibleWidth(ellipsis));
  let cut = "";
  let w = 0;
  for (const cp of Array.from(text)) {
    const cw = visibleWidth(cp);
    if (w + cw > target) break;
    cut += cp;
    w += cw;
  }
  return cut + ellipsis;
}
