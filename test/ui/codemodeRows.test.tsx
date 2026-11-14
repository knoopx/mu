/**
 * A codemode script, painted the way a terminal paints it.
 *
 * A script answers with no shape the log has a table for, so its row is three
 * blocks in pi's own order: the script, one line per call it made, and what it
 * printed — with pi's own separators and none of its headings. The wall time is a
 * figure about the call, so it stands below the plate rather than inside it.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { releaseAll } from "../harness";
import { logScene } from "../stage/log";
import { CODEMODE_ITEMS } from "../fixtures/scenes/codemode-run";

afterEach(releaseAll);

const SCRIPT = CODEMODE_ITEMS.find(
  (item) => item.kind === "tool" && item.name === "codemode",
)!;

describe("a script instead of eleven commands", () => {
  test("the script is the first thing the row shows", async () => {
    const screen = await logScene({ items: [SCRIPT] });
    // The header says nothing: a line quoting the script's first statement over
    // the top of that same script repeats the thing under it.
    expect(screen.mentions("codemode")).toBe(1);
    expect(screen.codeMentions("const sessions = await tools.vcs_log")).toBe(1);
    expect(screen.codeMentions(".filter((d) => d.blocks > 0)")).toBe(1);
  });

  test("one line per nested call, in the order the script made them", async () => {
    const screen = await logScene({ items: [SCRIPT] });
    // The call's own line, not the script's mention of the same tool: the name
    // alone, printed exactly once.
    const callLine = (name: string): number => {
      const lines = screen.inkOf("").filter((entry) => entry.text === name);
      expect(lines.length).toBe(1);
      return lines[0]!.y;
    };
    const calls = [
      "vcs-log",
      "guardrails-coverage",
      "guardrails-test",
      "chart-render",
    ].map(callLine);
    for (let i = 1; i < calls.length; i++)
      expect(calls[i]!).toBeGreaterThan(calls[i - 1]!);
    // Each line carries the arguments it was called with and how long it took.
    expect(screen.says("{ limit: 200 }")).toBe(true);
    expect(screen.says("640ms")).toBe(true);
    expect(screen.says("1.2s")).toBe(true);
  });

  test("a guardrails block inside a script surfaces under the call that carried it", async () => {
    const screen = await logScene({ items: [SCRIPT] });
    const reason = screen.ink("blocked(guardrails/uv)");
    expect(reason.y).toBeGreaterThan(screen.ink("guardrails-test").y);
    expect(reason.y).toBeLessThan(screen.ink("chart-render").y);
    expect(screen.says("suite run refused a raw python3 invocation")).toBe(
      true,
    );
  });

  test("what it printed keeps pi's separators and loses pi's headings", async () => {
    const screen = await logScene({ items: [SCRIPT] });
    expect(screen.says("==> text 1/3 <==")).toBe(true);
    expect(screen.says("==> text 3/3 <==")).toBe(true);
    expect(screen.says("vcs-log: 12 calls")).toBe(true);
    expect(screen.says("Script completed")).toBe(false);
    expect(screen.says("Wall time")).toBe(false);
    expect(screen.says("Output:")).toBe(false);
  });

  test("the wall time stands off the plate, below the answer", async () => {
    const screen = await logScene({ items: [SCRIPT] });
    const took = screen.ink("Took 4.2s");
    expect(took.y).toBeGreaterThan(screen.ink("guardrails/uv: 1 blocked").y);
    // How long the run took is a figure about the call, not another line of what
    // the call printed.
    expect(screen.mentions("Took 4.2s")).toBe(1);
  });
});
