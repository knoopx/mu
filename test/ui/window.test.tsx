/**
 * The window as a whole: what the app says about itself and its session in the
 * frame around the log.
 *
 * The rows have their own test (`test/ui/logRows`), the panels theirs
 * (`test/ui/composerPanels`), the bar its own (`test/ui/sessionStatus`). What
 * belongs to the window is the frame: which folder this is and which bookmark it
 * stands on, the session's figures kept in one line at the bottom, and a session
 * in flight marked in the composer's band — hung beside the draft, never written
 * as a line of prose at the end of the log.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { homedir } from "node:os";
import { releaseAll, type Screen } from "../harness";
import { chatWindow } from "../stage/window";
import { SESSION_ITEMS, STREAM_TURN } from "../fixtures/scenes/photo-strip";
import { PAGE_INSET } from "../../src/plugins/core/lib/ui/transcriptLayout";
import type { TranscriptItem } from "../../src/plugins/core/lib/agent/transcriptState";

afterEach(releaseAll);

const BRAILLE = /[\u2800-\u28FF]/;

const settled: TranscriptItem[] = SESSION_ITEMS;
const inFlight: TranscriptItem[] = [...SESSION_ITEMS, ...STREAM_TURN];

/** Ink the renderer has actually laid out: a virtualised row off the page is in
 *  the tree, but it has no geometry to measure. */
const laidOut = (screen: Screen) =>
  screen
    .inkOf("")
    .filter((entry) => Number.isFinite(entry.x) && Number.isFinite(entry.y));

const thisFolder = `~${process.cwd().slice(homedir().length)}`;

describe("the window", () => {
  test("it names the folder it is a window on, and the bookmark it stands on", async () => {
    const screen = await chatWindow({ items: settled });
    const ink = laidOut(screen);
    const found = ink.find((entry) => entry.text === thisFolder);
    if (found === undefined) throw new Error(`no header row for ${thisFolder}`);
    const folder = found;
    // The header's text stands in the log's text column, not in its own one.
    expect(folder.x).toBe(PAGE_INSET);
    // A bookmark, when the repo has one, rides beside the path rather than under it.
    const bookmark = ink.find(
      (entry) => entry.y === folder.y && entry.x > folder.x + folder.width,
    );
    expect(bookmark ?? null).not.toBeNull();
  });

  test("the session's own figures are kept in one line at the bottom", async () => {
    const screen = await chatWindow({ items: settled });
    const ink = laidOut(screen);
    const bottom = Math.max(...ink.map((entry) => entry.y));
    const bar = ink.filter((entry) => Math.abs(entry.y - bottom) <= 4);
    const line = bar.map((entry) => entry.text).join(" ");
    // Turns, tokens, span and rate, on one line that does not run out of the window.
    expect(line).toMatch(/\d+ turns/);
    expect(line).toMatch(/↑[\d.]+K ↓[\d.]+K/);
    expect(line).toMatch(/\d+m \d+s/);
    expect(line).toMatch(/[\d.]+ tok\/s/);
    for (const entry of bar)
      expect(entry.x + entry.width).toBeLessThanOrEqual(1280);
  });

  test("a session in flight is marked in the composer's band, not written as prose", async () => {
    const screen = await chatWindow({ items: inFlight, streaming: true });
    // Nothing in the log announces that work is happening.
    expect(screen.says("Working")).toBe(false);
    expect(screen.says("Loading")).toBe(false);

    const ink = laidOut(screen);
    const bar = Math.max(...ink.map((entry) => entry.y));
    const marks = ink.filter((entry) => BRAILLE.test(entry.text));
    expect(marks.length).toBe(1);
    // The mark stands above the bar, in the band the draft is typed into, and it
    // hangs to the left of the page's text column.
    expect(marks[0]!.y).toBeLessThan(bar);
    expect(marks[0]!.y).toBeGreaterThan(bar - 120);
    expect(marks[0]!.x).toBeLessThan(PAGE_INSET);
  });

  test("a settled window hangs no mark beside the composer", async () => {
    const screen = await chatWindow({ items: settled, streaming: false });
    expect(
      laidOut(screen).filter((entry) => BRAILLE.test(entry.text)).length,
    ).toBe(0);
  });

  test("the draft is the window's, and it is on the page before it is sent", async () => {
    const screen = await chatWindow({
      items: settled,
      draft: "crop the portrait out of the sheet",
    });
    expect(screen.painted()).toContain("crop the portrait out of the sheet");
    // The bar's figures do not move because a draft exists: they are the session's.
    const ink = laidOut(screen);
    const bottom = Math.max(...ink.map((entry) => entry.y));
    const line = ink
      .filter((entry) => Math.abs(entry.y - bottom) <= 4)
      .map((entry) => entry.text)
      .join(" ");
    expect(line).toMatch(/\d+ turns/);
  });
});
