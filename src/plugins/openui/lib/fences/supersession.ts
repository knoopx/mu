/**
 * Whether a reply has been answered.
 *
 * The rule the reference plugin enforces: once the thread has a user message
 * after the reply that holds a block, that block's open choices go away — a
 * question that has been answered stops being a question. mu's transcript is the
 * whole conversation in order, so the rule is one backward pass over it rather
 * than a read of a remote outline.
 */

/** The part of a transcript row this rule reads. */
export interface RowKind {
  kind: string;
}

/**
 * For every row, whether a user row follows it.
 *
 * A block in a reply that has already been answered is closed: its staged
 * answers have gone with the message that was sent, and its buttons are not a
 * question any more.
 */
export function supersededOf(rows: readonly RowKind[]): boolean[] {
  const out: boolean[] = new Array(rows.length).fill(false);
  let seen = false;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    out[index] = seen;
    if (rows[index]?.kind === "user") seen = true;
  }
  return out;
}
