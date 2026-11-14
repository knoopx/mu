/**
 * The tools that write and grade the rules, drawn as the log draws everything.
 *
 * A guardrails call has one summary, and it stands on the header outside the
 * card: the scope, what the call counted, and the figures it ran with as chips.
 * The card underneath is only its answer — rows whose columns the list measures
 * across every row it holds, so a count reads against a shared end and a domain
 * name starts where its neighbour's does, whatever length either one has.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { releaseAll, type Ink } from "../harness";
import { ink, logRow } from "../stage/log";
import {
  GUARDRAILS_COVERAGE_ITEM,
  GUARDRAILS_FIXTURE_ITEM,
  GUARDRAILS_TEST_ITEM,
} from "../fixtures/guardrailsTools";

afterEach(releaseAll);

/** Every row of a list starts its text at one x, or the list is a ragged column. */
const oneColumn = (rows: Ink[]): void => {
  expect(rows.length).toBeGreaterThan(1);
  const starts = new Set(rows.map((row) => Math.round(row.x)));
  expect(starts.size).toBe(1);
};

/** A figure column reads against one end; a word hugging the name before it is
 *  the ragged tail this log does not allow. */
const oneEnd = (rows: Ink[]): void => {
  expect(rows.length).toBeGreaterThan(1);
  const ends = new Set(rows.map((row) => Math.round(row.x + row.width)));
  expect(ends.size).toBe(1);
};

describe("a coverage scan", () => {
  test("its header states the scan once, outside the card", async () => {
    const screen = await logRow(GUARDRAILS_COVERAGE_ITEM);
    const header = screen.ink("~/.pi/agent/sessions");
    expect(header.text).toContain("9 domains");
    expect(header.text).toContain("3 never fired");
    expect(header.text).toContain("every session");
    // One summary, one place: nothing tallies the set again under the rows, and
    // the card opens on the domains rather than a copy of the header.
    expect(screen.mentions("never fired")).toBe(1);
    expect(screen.mentions("domains=")).toBe(0);
    expect(screen.mentions("rules=")).toBe(0);
  });

  test("the figures it scanned with ride its header as chips", async () => {
    const screen = await logRow(GUARDRAILS_COVERAGE_ITEM);
    const files = screen.ink("1201");
    const rules = screen.ink("237");
    // Above the first row, because they are the call and not its answer.
    for (const chip of [files, rules])
      expect(chip.y).toBeLessThan(screen.ink("uv").y);
  });

  test("every domain starts its name in the same column", async () => {
    const screen = await logRow(GUARDRAILS_COVERAGE_ITEM);
    const domains = [
      "jj",
      "nix",
      "python",
      "search-flags",
      "trash-deletion",
      "uv",
    ];
    oneColumn(ink(screen).filter((entry) => domains.includes(entry.text)));
  });

  test("the counts read against one end, whatever the domain beside them is", async () => {
    const screen = await logRow(GUARDRAILS_COVERAGE_ITEM);
    const figures = ink(screen).filter((entry) =>
      /(block|blocks)( · \w+ ago)?$/.test(entry.text),
    );
    oneEnd(figures);
    // A fired domain says how often and when, in that one column.
    expect(screen.says("91 blocks · 10m ago")).toBe(true);
    expect(screen.says("0 blocks")).toBe(true);
  });

  test("the rows stand in the scan's own order, busiest first", async () => {
    const screen = await logRow(GUARDRAILS_COVERAGE_ITEM);
    const top = (name: string) => screen.ink(name).y;
    // The card draws the order the scan answered with, rather than sorting the
    // names back into the alphabet: what stops work leads, and a domain that has
    // never fired sinks to the tail.
    expect(top("uv")).toBeLessThan(top("trash-deletion"));
    expect(top("trash-deletion")).toBeLessThan(top("jj"));
    expect(top("search-flags")).toBeLessThan(top("nix"));
    expect(top("package-manager")).toBeLessThan(top("python"));
    expect(top("python")).toBeLessThan(top("typescript"));
  });

  test("a state is a pill standing in a column of its own", async () => {
    const screen = await logRow(GUARDRAILS_COVERAGE_ITEM);
    expect(screen.countOf("never")).toBe(3);
    oneEnd(ink(screen).filter((entry) => entry.text === "never"));
  });

  test("it answers the rules this build holds, and no other name", async () => {
    const screen = await logRow(GUARDRAILS_COVERAGE_ITEM);
    // A block reason quoted inside command output is not a block, and a name no
    // rule holds is not a row: the scan is a report on this rule set only.
    expect(screen.mentions("legacy")).toBe(0);
    expect(screen.mentions("blocked(")).toBe(0);
    expect(screen.mentions("ruled")).toBe(0);
  });
});

describe("a suite run", () => {
  test("its header says the verdict, and the card holds the fixtures", async () => {
    const screen = await logRow(GUARDRAILS_TEST_ITEM);
    const header = screen.ink("2 suites");
    expect(header.text).toContain("5/6 pass");
    expect(header.text).toContain("1 fail");
    expect(screen.mentions("5/6 pass")).toBe(1);
    expect(screen.mentions("pass=")).toBe(0);
  });

  test("the parser it ran against rides the header", async () => {
    const screen = await logRow(GUARDRAILS_TEST_ITEM);
    expect(screen.ink("ready").y).toBeLessThan(screen.ink("block-npm-i").y);
  });

  test("a run over two suites says which fixtures belong to which", async () => {
    const screen = await logRow(GUARDRAILS_TEST_ITEM);
    expect(screen.says("package-manager")).toBe(true);
    expect(screen.says("python")).toBe(true);
    // The failing fixture is the row out of step, and it names why.
    expect(screen.says("wanted a block, the engine released it")).toBe(true);
  });

  test("what the engine answered reads against one end", async () => {
    const screen = await logRow(GUARDRAILS_TEST_ITEM);
    oneEnd(
      ink(screen).filter((entry) =>
        ["blocked", "released"].includes(entry.text),
      ),
    );
  });

  test("a caution about the run is stated once", async () => {
    const screen = await logRow(GUARDRAILS_TEST_ITEM);
    expect(screen.mentions("disarmed in this run")).toBe(1);
  });
});

describe("a fixture write", () => {
  test("its header tallies the write and the card lists the ids", async () => {
    const screen = await logRow(GUARDRAILS_FIXTURE_ITEM);
    const header = screen.ink("package-manager ·");
    expect(header.text).toContain("2 writes");
    expect(header.text).toContain("1 deletion");
    expect(screen.mentions("written=")).toBe(0);
    expect(screen.says("block-npm-run")).toBe(true);
    expect(screen.says("ok-stale-shape")).toBe(true);
  });

  test("the suite it wrote is named by the file it landed in", async () => {
    const screen = await logRow(GUARDRAILS_FIXTURE_ITEM);
    expect(
      screen.says("~/.config/mu/guardrails/package-manager.fixtures.json"),
    ).toBe(true);
  });

  test("the verb of an operation is a figure, not a pill", async () => {
    const screen = await logRow(GUARDRAILS_FIXTURE_ITEM);
    oneEnd(
      ink(screen).filter((entry) =>
        ["added", "updated", "deleted"].includes(entry.text),
      ),
    );
  });
});
