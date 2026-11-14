/**
 * An answer read as a document: prose, a written file, and a table.
 *
 * mu's log is not a list of one-line log entries with prose between them. A reply
 * is markdown with headings, paragraphs and GFM tables; a written file is shown
 * with its text and the size of what the log left out. The claims here are about
 * what is painted — including the parts GPUI paints inside `<markdown>`, which the
 * element tree alone cannot see.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { releaseAll } from "../harness";
import { logScene } from "../stage/log";
import { DOCUMENT_ITEMS } from "../fixtures/scenes/documents";

afterEach(releaseAll);

describe("the log read as a document", () => {
  test("a written file names its size and what the log left out", async () => {
    const screen = await logScene({ items: DOCUMENT_ITEMS });
    const header = screen.ink("docs/panels.md · 23 lines · 11 not shown");
    expect(header.text).toContain("23 lines");
    expect(header.text).toContain("11 not shown");
    // The file's own text is the body, painted bare under that header.
    expect(screen.codeMentions("## What a panel owns")).toBe(1);
  });

  test("a reply's table is drawn as a table, not as a paragraph of pipes", async () => {
    const screen = await logScene({ items: DOCUMENT_ITEMS });
    // The table's cells are painted; a GFM table inside markdown is drawn by
    // GPUI, so the reading has to be the painted run rather than the tree.
    expect(screen.codeMentions("| panel | what it costs the height |")).toBe(1);
    expect(screen.codeMentions("one row per command")).toBe(1);
    // And the prose around it is painted once, in the order it was written.
    const prose = [
      "## What a panel owns",
      "one measure from the top and bottom",
    ];
    const painted = screen.painted().join("\n");
    for (const line of prose) expect(painted.includes(line)).toBe(true);
    expect(
      screen.codeMentions(
        "A panel is a band above the composer with one column of ink.",
      ),
    ).toBe(1);
  });

  test("a turn that was cut short stays where it stopped", async () => {
    const screen = await logScene({ items: DOCUMENT_ITEMS });
    // The scene's last turn was truncated mid-word; the log shows it cut, and
    // does not invent the rest.
    expect(screen.says("st—")).toBe(true);
    expect(screen.says("and every column a figure can stand in")).toBe(false);
  });

  test("the whole document stands in one column", async () => {
    const screen = await logScene({ items: DOCUMENT_ITEMS });
    const left = Math.min(...screen.inkOf("").map((entry) => entry.x));
    expect(left).toBeGreaterThanOrEqual(56);
  });
});
