/**
 * The `ui` blocks of a reply, held in the program store.
 *
 * A block written inline in a message is a program like any other: it is
 * parsed against this app's library, drawn by the same renderer, keeps the
 * `$variable` values the human left, and can be read with `openui-state`. What
 * differs is where it comes from and what its key is.
 *
 * The key is the reply's place in the conversation and the block's place among
 * that reply's blocks — the reference plugin's `${message.id}#${language}#${index}`,
 * with a position for a message id because mu's transcript rows are re-numbered
 * when a session is resumed. A key that survives a resume is the point: the
 * screen is painted again from the message, and the block keeps being the block
 * the human already answered.
 *
 * While the reply streams, the block is parsed as a prefix. When a prefix draws
 * nothing, the last frame that did is kept, so a screen does not blank itself
 * halfway through a token.
 */

import { MAX_PROGRAM_CHARS } from "../../constants";
import type { OpenUIProgramParse } from "../../types";
import { parseProgram, parseStreaming } from "../analysis/parse";
import { dropRuntime } from "../analysis/run";
import { answerSheet } from "../answer/store";
import { programStore } from "../programStore/store";
import type { ReplyFence } from "./read";
import type { ParseResult } from "@openuidev/lang-core";

/** The namespace a reply block's program name lives in. */
const PREFIX = "ui#";

/** A block's state key: which reply, which block of it. */
export const fenceKey = (message: number, fence: number): string =>
  `${PREFIX}${String(message)}#${String(fence)}`;

/** Whether a program name is a reply block's rather than a tool program's. */
export const isFenceKey = (name: string): boolean => name.startsWith(PREFIX);

/** A parse kept because it is the last one that drew anything. */
interface HeldParse {
  parse: OpenUIProgramParse;
  result: ParseResult;
}

/** A parse that produced a tree the renderer can walk. */
const drew = (outcome: {
  parse: OpenUIProgramParse;
  result: ParseResult;
}): boolean =>
  outcome.result.root !== null && outcome.parse.components.length > 0;

/** The last frame of a block that still drew, so a bad prefix never blanks it. */
const lastGood = new Map<string, HeldParse>();

/**
 * Hold one block of one reply, and say whether anything moved.
 *
 * Called on every paint of the message, which while a reply streams is on every
 * delta — so a block whose source and status have not moved writes nothing.
 */
export function holdFence(message: number, block: ReplyFence): string {
  const name = fenceKey(message, block.fence);
  const streaming = block.status === "streaming";
  const existing = programStore.get(name);

  if (
    existing !== undefined &&
    existing.source === block.source &&
    existing.streaming === streaming
  )
    return name;

  const source = block.source.slice(0, MAX_PROGRAM_CHARS);
  const outcome = streaming ? parseStreaming(source) : parseProgram(source);
  const held: HeldParse = drew(outcome)
    ? outcome
    : (lastGood.get(name) ??
      (existing !== undefined && drew(existing)
        ? { parse: existing.parse, result: existing.result }
        : outcome));
  if (drew(outcome)) lastGood.set(name, outcome);

  programStore.setSource(name, source, held.parse, held.result, "", {
    streaming,
    activate: false,
    fence: true,
  });
  return name;
}

/** A block left the conversation (a rewind, a branch): its frame and its program go. */
export function dropFence(name: string): void {
  lastGood.delete(name);
  dropRuntime(name);
  programStore.remove(name);
  answerSheet.dropBlock(name);
}

/**
 * Forget the blocks of replies that are no longer in the conversation.
 *
 * A reply is named by its place among the replies, so a rewind or a branch moves
 * that place, and a block whose message is gone is painted by nothing. Left in
 * the store it would hold a state nobody reads, and the paragraph it staged in
 * the draft would keep answering a question no screen asks any more.
 */
export function pruneFences(replies: number): void {
  for (const record of programStore.list()) {
    if (!record.fence) continue;
    const message = Number.parseInt(record.name.slice(PREFIX.length), 10);
    if (!Number.isFinite(message) || message < replies) continue;
    dropFence(record.name);
  }
}

/** How many programs the log holds that are reply blocks. */
export function fenceCount(): number {
  return programStore.list().filter((record) => record.fence).length;
}
