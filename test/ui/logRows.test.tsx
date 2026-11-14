/**
 * What a tool row in the log says, and where it stands.
 *
 * The scene is the one the app is judged by day to day: a command that ran, a
 * file read, a command that failed, a grep, a photo read, an edit that carried a
 * diff, a write still arriving with its arguments streaming in. Every claim below
 * is a claim about ink on screen — what the row prints, how many times it prints
 * it, and where layout put it.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { releaseAll } from "../harness";
import {
  INSET,
  ink,
  inkLeftOfColumn,
  logScene,
  textColumn,
} from "../stage/log";
import { AGENT_JOB_ITEMS } from "../fixtures/scenes/agent-jobs";
import { ran, running } from "../fixtures/turn";

afterEach(releaseAll);

const RUN = AGENT_JOB_ITEMS.filter((item) => item.kind === "tool");

describe("the log's rows", () => {
  test("every line of ink stands in the log's one text column", async () => {
    const screen = await logScene({ items: RUN.slice(0, 6) });
    // Text starts at the page inset; nothing a row prints may stand left of it,
    // because the mark gutter hangs there and only a header's glyph may.
    expect(textColumn(screen)).toBe(INSET);
    expect(inkLeftOfColumn(screen)).toEqual([]);
    expect(ink(screen).length).toBeGreaterThan(10);
  });

  test("a ran command is its header, its command, and its output — each once", async () => {
    const screen = await logScene({ items: [RUN[0]!] });
    expect(screen.says("bun run scratch/panel-rows.ts")).toBe(true);
    expect(screen.mentions("bash")).toBe(1);
    // The output is the answer, not a second copy of the header.
    expect(screen.mentions("1x  slot 216px  rows 6   ok")).toBe(1);
    expect(screen.ink("bash").y).toBeLessThan(
      screen.ink("1x  slot 216px  rows 6   ok").y,
    );
  });

  test("a read prints its range on the header and the file bare under it", async () => {
    const screen = await logScene({ items: [RUN[1]!] });
    expect(
      screen.ink("src/plugins/core/lib/composer/panelHeight.ts · lines 1–6").y,
    ).toBeLessThan(200);
    // The file's text is painted by the native <code> element, which carries no
    // plate of its own — it is not a card inside a card, and it is not a copy of
    // the header line either.
    expect(screen.codeMentions("composerPanelRowsForHeight")).toBe(1);
    expect(screen.mentions("composerPanelRowsForHeight")).toBe(0);
    expect(screen.says("export const rowBox")).toBe(false);
  });

  test("a failed call keeps its error, and does not restate its own header", async () => {
    const screen = await logScene({ items: [RUN[2]!] });
    expect(screen.says("error TS2554: Expected 1 arguments, but got 0.")).toBe(
      true,
    );
    // The row is marked failed by its mark, not by a caption that repeats the
    // tool's name or its command under the header.
    expect(screen.mentions("bash")).toBe(1);
    expect(screen.mentions("bun run typecheck")).toBe(1);
  });

  test("a picture read draws the picture, and names its kind and size", async () => {
    const bare = await logScene({ items: [RUN[0]!] });
    const marks = bare.every("img").length;
    bare.unmount();

    const screen = await logScene({ items: [RUN[4]!] });
    // The header names what the file is — kind and size — and the thumbnail is
    // the answer: the row carries one picture element more than a row that read
    // text, and no line of prose describing it.
    const header = screen.ink("star-trails.jpg");
    expect(header.text).toContain("image/jpeg");
    expect(header.text).toContain("17.9KB");
    expect(screen.every("img").length).toBe(marks + 1);
    expect(screen.says("Read image file")).toBe(false);
  });

  test("an edit shows the diff it made, and only the diff", async () => {
    const screen = await logScene({ items: [RUN[5]!] });
    expect(screen.says("src/plugins/core/lib/composer/panelHeight.ts")).toBe(
      true,
    );
    // Both sides of the change stand under the header, each once: the line that
    // went out and the two that replaced it.
    expect(screen.codeMentions("(height - panelPad) / ROW_HEIGHT")).toBe(1);
    expect(
      screen.codeMentions("panelChromeHeight(t, { rows: 0, hints: true })"),
    ).toBe(1);
    expect(screen.codeMentions("(height - chrome) / ROW_HEIGHT")).toBe(1);
    expect(screen.says("@@ -18,7 +18,9 @@")).toBe(true);
  });

  test("a write still arriving paints the file as far as it is written", async () => {
    const call = running("c-streaming-write", "write", {
      path: "src/plugins/core/lib/composer/panelChrome.ts",
      content:
        "export function panelChromeHeight(\n  t: AdwaitaTheme,\n  slots: { rows: number; hints: boolean },",
    });
    const screen = await logScene({ items: [call] });
    // The header says what is true at this moment — it is being written, and
    // this much of it has arrived — never a finished count.
    const header = screen.ink("src/plugins/core/lib/composer/panelChrome.ts");
    expect(header.text).toContain("writing");
    expect(header.text).toContain("3 lines so far");
    expect(screen.says("Successfully wrote")).toBe(false);
    // The file is painted as far as it is written.
    expect(screen.codeMentions("slots: { rows: number; hints: boolean }")).toBe(
      1,
    );
    // And the row says it is running with a mark, not a line of prose: a braille
    // frame from pi's own spinner, and no word "Working" anywhere.
    const spinner = ink(screen).find((entry) =>
      /[\u2800-\u28FF]/.test(entry.text),
    );
    expect(spinner).toBeDefined();
    expect(screen.says("Working")).toBe(false);
  });

  test("a call's own figures ride its header, and never sit in the card too", async () => {
    const call = ran(
      "c-counts",
      "read",
      { path: "src/plugins/core/lib/composer/chrome.ts", offset: 1, limit: 12 },
      Array.from({ length: 12 }, (_, i) => `line ${i + 1}`).join("\n"),
      4_000,
    );
    const screen = await logScene({ items: [call] });
    expect(
      screen.ink("src/plugins/core/lib/composer/chrome.ts").text,
    ).toContain("lines 1–12");
    expect(screen.mentions("lines 1–12")).toBe(1);
  });

  test("the rows keep the order the agent made them in", async () => {
    const screen = await logScene({ items: RUN.slice(0, 5) });
    const headers = [
      "bun run scratch/panel-rows.ts",
      "src/plugins/core/lib/composer/panelHeight.ts · lines 1–6",
      "error TS2554: Expected 1 arguments, but got 0.",
      "star-trails.jpg · image/jpeg · 17.9KB",
    ].map((needle) => screen.ink(needle).y);
    for (let i = 1; i < headers.length; i++)
      expect(headers[i]!).toBeGreaterThan(headers[i - 1]!);
  });
});
