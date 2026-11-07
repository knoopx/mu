/**
 * Moving a change in the stack.
 *
 * Move mode reorders the panel's own list of changes; the rebase itself is one
 * jj call that lands the moved change beside the change it was pushed past.
 * Both halves need to know where a move lands, and neither is a key's business.
 */
import { type Change } from "adwaita-gpuix";

/** Swap two rows of the move list, or say the target is not on the list. */
export function swapRow(
  rows: readonly Change[],
  from: number,
  to: number,
): Change[] | null {
  if (to < 0 || to >= rows.length) return null;
  const next = [...rows];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/**
 * Where a move lands: beside the change next to the row being moved, on the
 * side the selection came from. Moving to either end of the stack has no
 * change to land beside, which is why the panel refuses it.
 */
export function moveLanding(
  rows: readonly Change[],
  from: number,
  to: number,
): { moved: Change; target: Change; after: boolean } | null {
  const after = to > from;
  const target = rows[after ? to - 1 : to + 1];
  const moved = rows[to];
  if (target === undefined || moved === undefined) return null;
  return { moved, target, after };
}
