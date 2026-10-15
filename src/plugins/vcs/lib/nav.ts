import { FALLBACK_PAGE_ROWS } from "../constants";
import type { NavDirection } from "../types";

function navDelta(direction: NavDirection, pageRows: number): number {
  switch (direction) {
    case "up":
      return -1;
    case "pageUp":
      return -Math.max(1, pageRows);
    case "pageDown":
      return Math.max(1, pageRows);
    default:
      return 1;
  }
}

export function navIndex(
  current: number,
  itemCount: number,
  direction: NavDirection,
  pageRows: number = FALLBACK_PAGE_ROWS,
): number {
  const maxIndex = itemCount - 1;
  if (maxIndex < 0) return 0;
  return Math.max(
    0,
    Math.min(maxIndex, current + navDelta(direction, pageRows)),
  );
}

export function navDirectionOf(id: string): NavDirection | null {
  switch (id) {
    case "up":
      return "up";
    case "down":
      return "down";
    case "page-up":
      return "pageUp";
    case "page-down":
      return "pageDown";
    default:
      return null;
  }
}
