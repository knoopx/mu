/**
 * The answer sheet's pure rules.
 *
 * The contract this plugin is built on, taken from the reference implementation:
 * **nothing the human picks is sent on its own.** The composer is the answer
 * sheet. A choice, a form field or an approval stages a plain-text line —
 * `Label: answer` — into the draft the person is already typing, and it reaches
 * the agent when they send, beside whatever they wrote themselves.
 *
 * So the sheet owns a block of text inside the person's draft and must never
 * touch the rest of it. That is what `trackBlock` and `writeBlock` are for: the
 * sheet follows its own block through every edit of the draft by aligning the
 * draft before and after against a common prefix and a common suffix, and hands
 * the block over as the person's own text the moment it can no longer be told
 * apart from what they wrote.
 *
 * mu's draft is plain text — attachments are not mention pills inside it — so
 * the reference's mention handling has no counterpart here; the alignment, the
 * ownership rule and the paragraph the block is set apart by are its.
 */

/** One staged answer and where its question sits. */
export interface StagedEntry {
  /** The program (a reply block, or a named program) holding the question. */
  readonly block: string;
  /** The question's place in its block, in document order. */
  readonly position: string;
  /** Staging order, which orders blocks whose place is unknown. */
  readonly seq: number;
  /** What the agent receives for this question; one line per field for a Form. */
  readonly text: string;
}

/** Where an entry lives in the sheet. */
export const entryKey = (block: string, position: string): string =>
  `${block}\u0000${position}`;

/**
 * Blocks in the order their answers read: the order their first answer was
 * staged, and within a block the order the questions stand in it.
 */
export function orderEntries<E extends StagedEntry>(
  entries: readonly E[],
): E[] {
  const first = new Map<string, number>();
  for (const entry of entries)
    first.set(
      entry.block,
      Math.min(first.get(entry.block) ?? Number.POSITIVE_INFINITY, entry.seq),
    );
  return [...entries].sort((a, b) =>
    a.block === b.block
      ? a.seq - b.seq
      : (first.get(a.block) ?? 0) - (first.get(b.block) ?? 0),
  );
}

/** The answers block for these entries: one paragraph, in reply order; null when there is none. */
export function answersText(entries: readonly StagedEntry[]): string | null {
  const lines = orderEntries(entries)
    .map((entry) => entry.text.trim())
    .filter((text) => text !== "");
  return lines.length === 0 ? null : lines.join("\n");
}

/** The answers block the sheet wrote: its text, and where it stands in the draft the sheet last saw. */
export interface WrittenBlock {
  readonly text: string;
  readonly from: number;
  readonly to: number;
}

/** What became of the written block after a draft change. */
export type Tracked =
  | { readonly kind: "present"; readonly from: number; readonly to: number }
  /** The person changed it, or it cannot be told apart from what they wrote: it is their text now. */
  | { readonly kind: "edited" }
  /** The change took the whole block out. */
  | { readonly kind: "deleted" };

/**
 * Whether a region of the draft reads as the block: the same lines, where each
 * run of line breaks may have grown (an editor that keeps its lines apart) but
 * none may vanish, so a multi-line answer's own blank line stays.
 */
export function sameBlock(region: string, block: string): boolean {
  const ours = block.split(/(\n+)/);
  const theirs = region.split(/(\n+)/);
  return (
    ours.length === theirs.length &&
    ours.every((part, index) =>
      index % 2 === 0
        ? part === theirs[index]
        : (theirs[index] ?? "").length >= part.length,
    )
  );
}

/** Lines of the draft that are whole and the block's own: it starts and ends at a line boundary. */
const ownLines = (text: string, from: number, to: number): boolean =>
  (from === 0 || text[from - 1] === "\n") &&
  (to === text.length || text[to] === "\n");

/** One alignment of a text change: `before[from, end)` became `after[from, from + inserted.length)`. */
interface Diff {
  from: number;
  end: number;
  inserted: string;
}

function diff(
  before: string,
  after: string,
  greedy: "prefix" | "suffix",
): Diff {
  const most = Math.min(before.length, after.length);
  const prefix = (limit: number): number => {
    let length = 0;
    while (length < limit && before[length] === after[length]) length += 1;
    return length;
  };
  const suffix = (limit: number): number => {
    let length = 0;
    while (
      length < limit &&
      before[before.length - 1 - length] === after[after.length - 1 - length]
    )
      length += 1;
    return length;
  };
  // Text that repeats its neighbour fits at either end of the repeat; each greedy pick takes one.
  // The inserted text is cut from `after` at both ends — the end of it is where
  // the common suffix starts in `after`, not where it starts in `before`, and the
  // two differ by exactly what was inserted.
  const head = greedy === "prefix" ? prefix(most) : prefix(most - suffix(most));
  const tail = greedy === "prefix" ? suffix(most - head) : suffix(most);
  return {
    from: head,
    end: before.length - tail,
    inserted: after.slice(head, after.length - tail),
  };
}

/** A change standing wholly beside the block: the block moves by what the change
 *  netted, and stays the sheet's only while it is still whole lines reading as
 *  the same answers. */
function movedAside(
  after: string,
  block: WrittenBlock,
  change: Diff,
  shift: number,
): Tracked {
  const before = change.end <= block.from;
  const from = before ? block.from + shift : block.from;
  const to = before ? block.to + shift : block.to;
  return ownLines(after, from, to) &&
    sameBlock(after.slice(from, to), block.text)
    ? { kind: "present", from, to }
    : { kind: "edited" };
}

/** A change that took the whole block out: it is gone, unless the person typed
 *  those same lines themselves — then the words are theirs, not a deletion. */
function swallowed(block: WrittenBlock, change: Diff): Tracked {
  if (change.from > block.from || change.end < block.to)
    return { kind: "edited" };
  const kept = block.text
    .split("\n")
    .some(
      (line) => line.trim() !== "" && change.inserted.includes(line.trim()),
    );
  return kept ? { kind: "edited" } : { kind: "deleted" };
}

/** A change through the block: still the sheet's when only its line breaks changed. */
function movedThrough(
  after: string,
  block: WrittenBlock,
  change: Diff,
  shift: number,
): Tracked {
  let start = Math.min(block.from, change.from);
  let end = Math.max(block.to, change.end) + shift;
  while (start < end && after[start] === "\n") start += 1;
  while (end > start && after[end - 1] === "\n") end -= 1;
  if (
    sameBlock(after.slice(start, end), block.text) &&
    ownLines(after, start, end)
  )
    return { kind: "present", from: start, to: end };
  return swallowed(block, change);
}

function rebase(
  before: string,
  after: string,
  block: WrittenBlock,
  greedy: "prefix" | "suffix",
): Tracked {
  const change = diff(before, after, greedy);
  const shift = change.inserted.length - (change.end - change.from);
  // Wholly before or after the block: it moves, and must still be lines of its own.
  if (change.end <= block.from || change.from >= block.to)
    return movedAside(after, block, change, shift);
  return movedThrough(after, block, change, shift);
}

/**
 * Follow the sheet's block through one change of the draft, `before` (the text
 * the sheet last saw) to `after`.
 *
 * A change beside the block moves it; a change inside it makes it the person's
 * text; a change that took all of it out deletes it. When the change can be
 * aligned two ways that disagree about the block — they typed the same answers
 * next to it — ownership is unclear and the draft is left alone: the block
 * counts as theirs.
 */
export function trackBlock(
  before: string,
  after: string,
  block: WrittenBlock,
): Tracked {
  if (before === after)
    return { kind: "present", from: block.from, to: block.to };
  const left = rebase(before, after, block, "prefix");
  const right = rebase(before, after, block, "suffix");
  if (left.kind !== right.kind) return { kind: "edited" };
  if (
    left.kind === "present" &&
    right.kind === "present" &&
    (left.from !== right.from || left.to !== right.to)
  )
    return { kind: "edited" };
  return left;
}

/** A draft after writing the block, and where the block now stands (null: none). */
export interface Written {
  readonly text: string;
  readonly at: { readonly from: number; readonly to: number } | null;
}

/**
 * The draft with its answers block changed to `next` (null: no answers), where
 * the sheet's block stands at `at` (null when the draft holds none of it).
 *
 * The block is replaced in place; an emptied sheet takes it out together with
 * the paragraph break that set it apart; a first block is appended as its own
 * paragraph. Nothing else in the draft is touched. Null when there is nothing
 * to write.
 */
/** A region of the draft. */
interface Region {
  readonly from: number;
  readonly to: number;
}

/** A draft's first answers block: appended as its own paragraph — and a draft
 *  of only whitespace holds nothing of the person's, so it starts the draft. */
function appendBlock(draft: string, next: string): Written {
  if (draft.trim() === "")
    return { text: next, at: { from: 0, to: next.length } };
  const gap = draft.endsWith("\n\n")
    ? ""
    : draft.endsWith("\n")
      ? "\n"
      : "\n\n";
  const from = draft.length + gap.length;
  return {
    text: `${draft}${gap}${next}`,
    at: { from, to: from + next.length },
  };
}

/** The region a deletion takes out: the block plus the paragraph break that set
 *  it apart — before it, or after it when the block opens the draft. */
function retiredRegion(draft: string, at: Region): Region {
  let { from, to } = at;
  if (from > 0) {
    while (from > 0 && at.from - from < 2 && draft[from - 1] === "\n")
      from -= 1;
  } else {
    while (to < draft.length && to - at.to < 2 && draft[to] === "\n") to += 1;
  }
  return { from, to };
}

export function writeBlock(
  draft: string,
  at: Region | null,
  next: string | null,
): Written | null {
  if (at === null) return next === null ? null : appendBlock(draft, next);
  if (next === draft.slice(at.from, at.to)) return null;

  const region = next === null ? retiredRegion(draft, at) : at;
  const inserted = next ?? "";
  return {
    text: `${draft.slice(0, region.from)}${inserted}${draft.slice(region.to)}`,
    at:
      next === null
        ? null
        : { from: region.from, to: region.from + inserted.length },
  };
}
