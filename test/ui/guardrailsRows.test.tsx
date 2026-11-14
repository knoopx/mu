/**
 * A guardrails block: the reason a call has no answer.
 *
 * A blocked call is the one row in the log where the reason is the answer. It
 * lands over the row of the call it stopped, names the rule and the domain that
 * stopped it, and is drawn last — so a reader who only looks at the row still
 * learns what the rule was. The agent never arms a rule: the panel does, and the
 * scene stages the arming the same way the panel would.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { releaseAll } from "../harness";
import { logScene } from "../stage/log";
import { guardrailsScene } from "../fixtures/guardrails";

afterEach(releaseAll);

describe("a stopped call", () => {
  test("the row carries the reason, the rule and the domain it came from", async () => {
    const screen = await logScene({ items: guardrailsScene() });
    expect(screen.says("Guardrail pkg-npm · package-manager")).toBe(true);
    expect(
      screen.says("Use Bun equivalents: `bun add`, `bun run`, `bun install`"),
    ).toBe(true);
    // The reason states itself once: not in a card, not in a caption too.
    expect(screen.mentions("Use Bun equivalents")).toBe(1);
    // And the call it stopped is still named, so the reason has a subject.
    expect(screen.mentions("npm i zod")).toBe(1);
  });

  test("two rules, two reasons, each standing on its own call", async () => {
    const screen = await logScene({ items: guardrailsScene() });
    expect(screen.says("Guardrail pkg-global · package-manager")).toBe(true);
    expect(
      screen.says(
        "Install packages locally in the project with `bun add <package>`, not globally",
      ),
    ).toBe(true);
    // The count of blocks is exactly the number of stopped calls: a call that went
    // through wears none.
    expect(screen.countOf("Guardrail pkg-npm · package-manager")).toBe(1);
    expect(screen.countOf("Guardrail pkg-global · package-manager")).toBe(1);
    expect(screen.says("installed zod@4.6.7")).toBe(true);
    expect(screen.mentions("Guardrail ")).toBe(2);
  });

  test("the reason stands under the call it stopped, not above it", async () => {
    const screen = await logScene({ items: guardrailsScene() });
    const command = screen.ink("npm i zod");
    const reason = screen.ink("Guardrail pkg-npm · package-manager");
    expect(reason.y).toBeGreaterThan(command.y);
    // …and before the next call's header, so the block belongs to one row.
    const next = screen.ink("bun add -g eslint");
    expect(reason.y).toBeLessThan(next.y);
  });
});
