/**
 * A diagram in the log, and the parse error that stopped one.
 *
 * The model cannot see the picture, so the row's header carries the readings: the
 * kind, the file the SVG went to, the canvas it was laid out on, how many labels
 * it says, how big the file is. A refused diagram says none of that — it answers
 * with the line, the column, and the source line it stopped on.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { releaseAll } from "../harness";
import { logScene } from "../stage/log";
import { DIAGRAM_FAILED_ITEM, DIAGRAM_ITEM } from "../fixtures/diagram";

afterEach(releaseAll);

describe("a diagram, drawn", () => {
  test("the header names the kind, the file, and the canvas it was laid out on", async () => {
    const screen = await logScene({ items: [DIAGRAM_ITEM] });
    const header = screen.ink("flowchart LR · docs/architecture.svg");
    expect(header.text).toContain("flowchart LR");
    // The canvas, the label count and the file's size are the call's own figures.
    expect(screen.says("998×244")).toBe(true);
    expect(screen.says("4.9KB")).toBe(true);
  });

  test("the picture is drawn in the log, at the size the log has", async () => {
    const bare = await logScene({ items: [DIAGRAM_FAILED_ITEM] });
    const marks = bare.every("img").length;
    bare.unmount();

    const screen = await logScene({ items: [DIAGRAM_ITEM] });
    // A drawn diagram puts one more picture on the page than a refused one, and
    // it never overruns the page it is drawn into.
    expect(screen.every("img").length).toBeGreaterThan(marks);
    for (const image of screen.every("img")) {
      const bounds = screen.boundsOf(image);
      if (bounds === null) continue;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(1280 + 1);
    }
  });
});

describe("a diagram the parser refused", () => {
  test("the row says what it stopped on, in the source's own words", async () => {
    const screen = await logScene({ items: [DIAGRAM_FAILED_ITEM] });
    const header = screen.ink("sequence · syntax · Parse error on line 3:");
    expect(header.text).toContain("line 3, column 24");
    // The snippet is the card's whole content: the line, and the caret under the
    // column it stopped at.
    expect(screen.codeMentions("Session-->>Agent done")).toBe(1);
    expect(screen.says("-----------------------^")).toBe(true);
    // A refusal measures nothing: there is no canvas, no label count, no size.
    expect(screen.says("998×244")).toBe(false);
    expect(screen.says("4.9KB")).toBe(false);
  });
});
