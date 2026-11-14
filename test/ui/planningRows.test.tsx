/**
 * A plan in the log: every step in the colour of where it stands.
 *
 * The plan tool replaces the whole list on every call, so the log's last plan row
 * is the plan. What a reader needs off that row is the count that moved and the
 * standing of each step — and when a call is refused, which entry caused it.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { releaseAll } from "../harness";
import { ink, logScene } from "../stage/log";
import {
  PLAN_BAD_ITEM,
  PLAN_LATER_ITEM,
  PLAN_OPEN_ITEM,
} from "../fixtures/plan";

afterEach(releaseAll);

const standing = (screen: Awaited<ReturnType<typeof logScene>>, word: string) =>
  screen.countOf(word);

describe("the plan an agent wrote down before it started", () => {
  test("the header counts where the plan stands and names the current step", async () => {
    const screen = await logScene({ items: [PLAN_OPEN_ITEM] });
    const header = screen.ink("0/6 · read how a plugin's tool rows are drawn");
    expect(header.text).toContain("0/6");
    expect(header.text).toContain("read how a plugin's tool rows are drawn");
  });

  test("every step is one row: its number, its content, its standing", async () => {
    const screen = await logScene({ items: [PLAN_OPEN_ITEM] });
    expect(screen.says("write the plan contract in lib/steps.ts")).toBe(true);
    expect(screen.says("draw the plan rows in the log")).toBe(true);
    expect(screen.says("wire `plan` into the agent's tool list")).toBe(true);
    expect(standing(screen, "in progress")).toBe(1);
    expect(standing(screen, "pending")).toBe(5);
    // The numbers are a column, not one digit trailing each sentence.
    const numbers = ink(screen)
      .filter((entry) => /^[1-6]$/.test(entry.text))
      .map((entry) => entry.x);
    expect(numbers.length).toBe(6);
    for (const x of numbers) expect(x).toBe(numbers[0]);
  });

  test("the standings move when the same list is sent again", async () => {
    const first = await logScene({ items: [PLAN_OPEN_ITEM] });
    const before = standing(first, "pending");
    first.unmount();

    const screen = await logScene({ items: [PLAN_LATER_ITEM] });
    expect(screen.ink("2/6 · draw the plan rows in the log").text).toContain(
      "2/6",
    );
    // The header's count is the count of the rows under it: two steps read done.
    expect(standing(screen, "done")).toBe(2);
    expect(standing(screen, "pending")).toBe(before - 2);
    // Only one step may be in progress at a time in a plan worked in order.
    expect(standing(screen, "in progress")).toBe(1);
    expect(screen.says("completed")).toBe(false);
  });

  test("a step with a standing and nothing to do is refused, and named", async () => {
    const screen = await logScene({ items: [PLAN_BAD_ITEM] });
    expect(screen.ink("step 2 names nothing to do").text).toContain("step 2");
    expect(screen.says("(nothing to do)")).toBe(true);
    expect(screen.says("no content")).toBe(true);
    // A refused plan draws no list.
    expect(screen.says("0/6")).toBe(false);
    expect(standing(screen, "pending")).toBe(0);
    expect(standing(screen, "done")).toBe(0);
  });
});
