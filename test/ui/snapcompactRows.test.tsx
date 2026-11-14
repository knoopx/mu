/**
 * A context compacted by photocopy rather than by summary.
 *
 * The note the log shows is the whole system row's headline; the frames the
 * discarded span became are drawn as the pictures they are, so the reader can see
 * what was kept instead of taking it on trust.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { releaseAll } from "../harness";
import { logScene } from "../stage/log";
import { SNAPCOMPACT_ITEMS } from "../fixtures/scenes/snapcompact";

afterEach(releaseAll);

const NOTE = "Compacted · 2 frames archived";

describe("a span kept as pictures", () => {
  test("the note says what was archived, in figures", async () => {
    const screen = await logScene({ items: SNAPCOMPACT_ITEMS });
    const note = screen.ink(NOTE);
    expect(note.text).toContain("2 frames archived");
    expect(note.text).toContain("span of 249 925 characters");
    expect(note.text).toContain("summary replaced by the frame reader's guide");
    // The note is one line: it does not unfold into a card that restates it.
    expect(screen.mentions("frames archived")).toBe(1);
  });

  test("the note points at pages the reader can go and check", async () => {
    const screen = await logScene({ items: SNAPCOMPACT_ITEMS });
    // The log does not pretend to show the span: it says how many pages it became
    // and where they are, and the row that lists them prints their sizes.
    expect(screen.says("001.png")).toBe(true);
    expect(screen.says("002.png")).toBe(true);
    expect(screen.says("1 742 × 2 338")).toBe(true);
    expect(screen.says("412 KB")).toBe(true);
    expect(screen.says("388 KB")).toBe(true);
  });

  test("the evidence around it stays ordinary rows", async () => {
    const screen = await logScene({ items: SNAPCOMPACT_ITEMS });
    expect(screen.says("ls -l $(mu frames --session current)")).toBe(true);
    expect(screen.says("1 742 × 2 338")).toBe(true);
    expect(screen.says("mu replay --session current --explain")).toBe(true);
    expect(screen.says("request rebuilt from the session file")).toBe(true);
  });
});
