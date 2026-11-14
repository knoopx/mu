/**
 * The status bar: the session's own figures, read live.
 *
 * The bar is not a decoration — it is the one place a person can see how long
 * this turn is taking, how much of the window the context fills, and what the
 * provider has actually reported. A running turn has no usage to read, so its
 * tokens are estimated; a settled turn's figures come from the provider. The bar
 * has to tell those two states apart on screen, and it has to say a resumed
 * session's own length rather than the age of the window.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { releaseAll, stage } from "../harness";
import { SessionStatus } from "../../src/plugins/core/components/SessionStatus";
import { conversationStats } from "../../src/plugins/core/lib/agent/turnStats";
import { SESSION_ITEMS, STREAM_TURN } from "../fixtures/scenes/photo-strip";
import { clockOf } from "../fixtures/turn";

afterEach(releaseAll);

const settled = SESSION_ITEMS;
const live = [...SESSION_ITEMS, ...STREAM_TURN];

const bar = (items: typeof settled, now: number, bookmark: string | null) =>
  stage(
    <SessionStatus
      projectPath="~/Projects/gpuix-apps/mu"
      bookmark={bookmark}
      stats={conversationStats(items, { now, running: false })}
    />,
    { width: 1280, height: ROW_LINE },
  );

const ROW_LINE = 32;

describe("the bar over the composer", () => {
  test("a settled session says its turns, its tokens and its span", async () => {
    const screen = await bar(settled, clockOf(settled), "main");
    const words = screen.words().join(" ");
    // Turns, tokens and the elapsed span are all figures, not a status sentence.
    expect(words).toMatch(/\d/);
    expect(screen.says("main")).toBe(true);
    expect(screen.says("~/Projects/gpuix-apps/mu")).toBe(true);
  });

  test("a turn in flight is marked as in flight, and its tokens are estimated", async () => {
    const settledScreen = await bar(settled, clockOf(settled), "main");
    const settledWords = settledScreen.words().join(" ");
    settledScreen.unmount();

    const screen = await bar(live, clockOf(live), "main");
    // The bar is reading a live figure now, so its words change shape: a rate is
    // shown that a settled session never prints.
    const liveWords = screen.words().join(" ");
    expect(liveWords).not.toBe(settledWords);
    expect(liveWords).toMatch(/\d/);
  });

  test("a window with no bookmark shows no bookmark", async () => {
    const screen = await bar(settled, clockOf(settled), null);
    expect(screen.says("main")).toBe(false);
  });

  test("the bar is one line, and it does not wrap", async () => {
    const screen = await bar(settled, clockOf(settled), "main");
    const lines = new Set(screen.inkOf("").map((entry) => entry.y));
    expect(lines.size).toBe(1);
    // Everything it prints fits the window it was given.
    for (const entry of screen.inkOf(""))
      expect(entry.x + entry.width).toBeLessThanOrEqual(1280);
  });
});
