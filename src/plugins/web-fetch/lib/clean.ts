/**
 * The page as text, and the part of it an answer can carry.
 *
 * A markdown dump is nearly the page already, so the pass is small: an image
 * becomes the text it was standing in for, runs of blank lines collapse to one,
 * and the character budget is spent on the opening, which is where a page's point
 * is. What fell off is said in the answer rather than left for the reader to
 * discover.
 */

import { MAX_PAGE_CHARS } from "../constants";

/** `![alt](url)` and `![alt][ref]` are the alt text once there is no image. */
const INLINE_IMAGE = /!\[([^\]]*)\]\([^)]*\)/g;
const REFERENCE_IMAGE = /!\[([^\]]*)\]\[[^\]]*\]/g;

export function pageTextOf(raw: string): string {
  const lines = raw
    .replace(INLINE_IMAGE, "$1")
    .replace(REFERENCE_IMAGE, "$1")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""));

  const kept: string[] = [];
  for (const line of lines) {
    if (line === "" && (kept.length === 0 || kept[kept.length - 1] === ""))
      continue;
    kept.push(line);
  }
  while (kept.length > 0 && kept[kept.length - 1] === "") kept.pop();

  return kept.join("\n");
}

export interface CappedPage {
  text: string;
  truncated: boolean;
}

export function capPage(page: string): CappedPage {
  if (page.length <= MAX_PAGE_CHARS) return { text: page, truncated: false };
  const cut = page.slice(0, MAX_PAGE_CHARS);
  const lastBreak = cut.lastIndexOf("\n");
  // A page is read a line at a time; a half line at the end reads as a bug.
  const body = lastBreak > MAX_PAGE_CHARS * 0.8 ? cut.slice(0, lastBreak) : cut;
  return { text: body, truncated: true };
}
