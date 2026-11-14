/**
 * What the project says about itself, drawn as rows a person can read down.
 *
 * The analyser's thresholds are three figures, so they wear three cells; the
 * findings are one row each, and the columns line up so a count reads against its
 * end instead of being shoved onto a second line.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { releaseAll } from "../harness";
import { ink, logScene } from "../stage/log";
import {
  QUALITY_COMPLEXITY_ITEM,
  QUALITY_DUPES_ITEM,
} from "../fixtures/quality";

afterEach(releaseAll);

describe("the survey of a project", () => {
  test("its header says how many findings there are, and how many are not shown", async () => {
    const screen = await logScene({ items: [QUALITY_COMPLEXITY_ITEM] });
    const header = screen.ink("(cwd) · 38 functions over threshold");
    expect(header.text).toContain("35 more not shown");
    // The omissions ride the header; nothing tallies itself under the answer.
    expect(screen.mentions("more not shown")).toBe(1);
  });

  test("one chip per figure, so a wide chip cannot be eaten by the header's clip", async () => {
    const screen = await logScene({ items: [QUALITY_COMPLEXITY_ITEM] });
    expect(screen.says("fallow 3.40.0")).toBe(true);
    // The three thresholds are three cells, not one cell of dotted prose.
    expect(screen.says("crap 30")).toBe(false);
    expect(screen.says("CC 20 · cognitive 15 · CRAP 30")).toBe(false);
    expect(screen.countOf("20")).toBe(1);
    expect(screen.countOf("15")).toBe(1);
    expect(screen.countOf("30")).toBe(1);
  });

  test("each finding is one row: where, what, and how bad", async () => {
    const screen = await logScene({ items: [QUALITY_COMPLEXITY_ITEM] });
    expect(screen.says("onKey")).toBe(true);
    expect(screen.says("src/plugins/core/hooks/useSessionTree.ts")).toBe(true);
    expect(screen.says("CC 18 · cog 10 · CRAP 342 · 41 ln")).toBe(true);
    // The severity words are a figure column: they read against a shared end, so
    // a long path never shoves a word onto a second line and the eye runs down
    // the worst findings without chasing a ragged tail.
    const severities = ink(screen).filter((entry) =>
      ["high", "moderate"].includes(entry.text),
    );
    expect(severities.length).toBeGreaterThanOrEqual(3);
    for (const cell of severities)
      expect(cell.x + cell.width).toBeCloseTo(
        severities[0]!.x + severities[0]!.width,
        0,
      );
  });

  test("a clone group names every place the clone sits", async () => {
    const screen = await logScene({ items: [QUALITY_DUPES_ITEM] });
    const header = screen.ink("(cwd) · 2 clone groups");
    expect(header.text).toContain("1.36% duplicated");
    expect(header.text).toContain("9 more not shown");
    expect(screen.says("71 lines × 2 instances")).toBe(true);
    expect(screen.says("412 tokens · spread 4")).toBe(true);
    // Both instances of a group are listed, each with its file and line range.
    expect(
      screen.says(
        "src/plugins/code-quality/components/QualityRows.tsx:119-164",
      ),
    ).toBe(true);
    expect(screen.says("src/plugins/vcs/components/VcsRows.tsx:131-201")).toBe(
      true,
    );
    // A group the analyser would actually merge says so in its own cell; the
    // group beside it, whose spread is wider, does not.
    expect(screen.countOf("208 tokens · spread 4 · extractable")).toBe(1);
    expect(screen.countOf("412 tokens · spread 4")).toBe(1);
  });
});
