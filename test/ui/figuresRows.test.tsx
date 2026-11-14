/**
 * A plot, a tree, and the two refusals that say why they were not drawn.
 *
 * A figure the model cannot see has to be read back to it: the axis, the range,
 * the peak, the count of what was left out. And a call that refused must name the
 * cell or the node that caused it, because that is the only way a model catches a
 * leaf one level too deep.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { releaseAll } from "../harness";
import { ink, logScene } from "../stage/log";
import { CHART_BAD_ITEM, CHART_ITEM } from "../fixtures/chart";
import { TREE_BAD_ITEM, TREE_ITEM } from "../fixtures/structure";

afterEach(releaseAll);

describe("a plot, drawn", () => {
  test("its header says what was plotted, and what was left out", async () => {
    const screen = await logScene({ items: [CHART_ITEM] });
    const header = screen.ink("bar · Apr → Dec");
    expect(header.text).toContain(
      "one change per working day, most months — the December drop is the holiday gap",
    );
    // The caption is a line about the call: stated on the header, not again in
    // the card.
    expect(screen.mentions("the December drop is the holiday gap")).toBe(1);
    // One chip per figure: the count of plotted points is a cell of its own, and
    // no cell joins three numbers with a dot.
    expect(screen.countOf("9")).toBe(1);
    expect(screen.countOf("41 → 134")).toBe(1);
  });

  test("its readings stand beside the picture a model cannot see", async () => {
    const screen = await logScene({ items: [CHART_ITEM] });
    // Range, peak and unit are stated as figures, not as prose about the plot.
    expect(screen.says("41 → 134")).toBe(true);
    expect(screen.says("Oct 134")).toBe(true);
    expect(screen.says("commits")).toBe(true);
  });

  test("the axis is one line of labels, in the order the points came", async () => {
    const screen = await logScene({ items: [CHART_ITEM] });
    const months = [
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const seen = months.map((month) => {
      const marks = screen.inkOf("").filter((entry) => entry.text === month);
      expect(marks.length).toBe(1);
      return marks[0]!;
    });
    // Every label stands on the axis line, and the axis runs left to right.
    for (const mark of seen) expect(mark.y).toBe(seen[0]!.y);
    for (let i = 1; i < seen.length; i++)
      expect(seen[i]!.x).toBeGreaterThan(seen[i - 1]!.x);
  });

  test("a value that is not a number refuses the plot and names the cell", async () => {
    const screen = await logScene({ items: [CHART_BAD_ITEM] });
    const header = screen.ink("one value is not a number");
    expect(header.text).toContain("nothing was plotted");
    expect(header.text).toContain("point 1 (“Oct”) holds 1,234");
    // The card names the offending cell, and nothing is measured of a picture
    // that was never drawn.
    expect(screen.says("point 1 · Oct")).toBe(true);
    expect(screen.says("1,234 is not a number")).toBe(true);
    expect(screen.countOf("Apr")).toBe(0);
    expect(screen.says("41 → 134")).toBe(false);
  });
});

describe("a structure, drawn", () => {
  test("the tree is drawn nested, and its columns line up", async () => {
    const screen = await logScene({ items: [TREE_ITEM] });
    expect(screen.says("14 nodes")).toBe(true);
    expect(screen.says("+3 −353")).toBe(true);

    const at = (text: string) => {
      const found = screen.inkOf("").filter((entry) => entry.text === text);
      expect(found.length).toBe(1);
      return found[0]!;
    };
    // A leaf stands under the folder it hangs in.
    expect(at("constants.ts").x).toBeGreaterThan(at("figures").x);

    // The added and removed counts are columns measured across the whole tree:
    // every cell of a column shares its x.
    const added = ink(screen).filter((entry) => /^\+\d+$/.test(entry.text));
    expect(added.length).toBeGreaterThan(1);
    for (const cell of added) expect(cell.x).toBe(added[0]!.x);
  });

  test("a folder that never named itself is refused, and named twice if there are two", async () => {
    const screen = await logScene({ items: [TREE_BAD_ITEM] });
    const header = screen.ink("a node has no name to draw");
    expect(header.text).toContain("the node under “figures” holds (nothing)");
    expect(header.text).toContain("1 more");
    expect(screen.countOf("(nothing) where a name belongs")).toBe(2);
    // No tree is drawn under a refusal.
    expect(screen.says("constants.ts")).toBe(false);
    expect(screen.says("14 nodes")).toBe(false);
  });
});
