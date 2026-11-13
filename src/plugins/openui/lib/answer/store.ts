/**
 * The answer sheet: what a conversation has staged, and the block of it the
 * sheet wrote into the draft.
 *
 * One sheet per session, held outside React for the same reason the program
 * store is: a staged answer outlives the row that staged it, is written by a
 * click that has no component of its own, and has to survive the message it
 * came from scrolling out of the log.
 *
 * The draft is the truth about what will be sent, so the sheet never insists on
 * its own text: `noteDraft` follows the block through every edit of the draft
 * and gives up the moment it can no longer be told apart from what the person
 * wrote. What the person sent is kept as the block's **sent** answer, which is
 * what folds an answered choice to a single line.
 */

import {
  answersText,
  entryKey,
  trackBlock,
  type StagedEntry,
  type WrittenBlock,
} from "./sheet";

/** One staged answer, with the identity it needs to be replaced in place. */
export interface StagedAnswer extends StagedEntry {
  key: string;
}

export type SheetListener = () => void;

export class AnswerSheet {
  private readonly entries = new Map<string, StagedAnswer>();
  /** What a question's answer was when it went out in a message. */
  private readonly sent = new Map<string, string>();
  private listeners = new Set<SheetListener>();
  private seq = 0;
  private touching = false;

  /** The block the sheet wrote in the draft, and where it stood. */
  written: WrittenBlock | null = null;
  /** The draft as the sheet last saw it. */
  lastDraft = "";

  /** Bumped on every change; a subscription reads the sheet through it. */
  version = 0;

  subscribe = (listener: SheetListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): number => this.version;

  private notify(): void {
    this.version += 1;
    for (const listener of [...this.listeners]) listener();
  }

  /** A change that must not land in the middle of a render. */
  touch = (): void => {
    if (this.touching) return;
    this.touching = true;
    queueMicrotask(() => {
      this.touching = false;
      this.notify();
    });
  };

  /**
   * Stage an answer for one question of one block, replacing what that question
   * staged before. An empty text takes the question's answer out.
   */
  stage(block: string, position: string, text: string): void {
    const key = entryKey(block, position);
    if (text.trim() === "") {
      if (!this.entries.delete(key)) return;
      this.notify();
      return;
    }
    const existing = this.entries.get(key);
    if (existing !== undefined && existing.text === text) return;
    this.entries.set(key, {
      block,
      position,
      seq: existing?.seq ?? this.seq++,
      text,
      key,
    });
    this.notify();
  }

  /** What a question currently has staged ("" when it has nothing). */
  stagedText(block: string, position: string): string {
    return this.entries.get(entryKey(block, position))?.text ?? "";
  }

  /** What a question went out with, if it has already been sent. */
  sentText(block: string, position: string): string {
    return this.sent.get(entryKey(block, position)) ?? "";
  }

  /** Whether the block has already answered this question. */
  readonly answered = (block: string, position: string): boolean =>
    this.sent.has(entryKey(block, position));

  /** Everything staged, in the order it reads. */
  staged(): StagedAnswer[] {
    return [...this.entries.values()];
  }

  /** Everything staged for one block. */
  stagedIn(block: string): StagedAnswer[] {
    return this.staged().filter((entry) => entry.block === block);
  }

  /** The paragraph the draft should hold, or null when nothing is staged. */
  text(): string | null {
    return answersText(this.staged());
  }

  /**
   * Follow the sheet's block through one change of the draft.
   *
   * Returns what became of it, which is what the caller uses to decide whether
   * the person has taken over the text the sheet wrote.
   */
  noteDraft(next: string): { kind: "present" | "edited" | "deleted" | "none" } {
    if (this.written === null) {
      this.lastDraft = next;
      return { kind: "none" };
    }
    const tracked = trackBlock(this.lastDraft, next, this.written);
    if (tracked.kind === "present") {
      this.written = { text: this.written.text, from: tracked.from, to: tracked.to };
      this.lastDraft = next;
      return tracked;
    }
    // The person owns that text now, or it is gone: either way the sheet stops
    // writing it, and the next answer appends a fresh paragraph.
    this.written = null;
    if (tracked.kind === "deleted") this.dropEntries();
    this.lastDraft = next;
    this.notify();
    return tracked;
  }

  /** Where the sheet's block stands in the draft, if it stands anywhere. */
  get at(): { from: number; to: number } | null {
    return this.written === null ? null : { from: this.written.from, to: this.written.to };
  }

  /** Record what the sheet wrote. */
  noteWritten(text: string, at: { from: number; to: number } | null): void {
    this.written = at === null || text === "" ? null : { text, from: at.from, to: at.to };
  }

  /**
   * A message went out: every staged answer becomes its question's sent answer,
   * and an answered choice folds.
   */
  markSent(): void {
    if (this.entries.size === 0) {
      this.written = null;
      this.lastDraft = "";
      return;
    }
    for (const entry of this.entries.values()) this.sent.set(entry.key, entry.text);
    this.dropEntries();
    this.written = null;
    this.lastDraft = "";
    this.notify();
  }

  /** A block left the conversation: its staged answers go, its sent record stays. */
  dropBlock(block: string): void {
    let moved = false;
    for (const key of [...this.entries.keys()])
      if (this.entries.get(key)?.block === block) {
        this.entries.delete(key);
        moved = true;
      }
    if (moved) this.notify();
  }

  /** Everything, staged and sent: what a fresh session starts without. */
  clear(): void {
    this.dropEntries();
    this.sent.clear();
    this.written = null;
    this.lastDraft = "";
    this.notify();
  }

  private dropEntries(): void {
    for (const key of [...this.entries.keys()]) this.entries.delete(key);
  }
}

/** The sheet the conversation stages into. */
export const answerSheet = new AnswerSheet();
