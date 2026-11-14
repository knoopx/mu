/**
 * The panels that describe the app to the person using it: plugins, projects,
 * the change stack, the conversation tree, the theme lists, and the guardrails
 * switch.
 *
 * Each of these panels is the only place its facts are said on screen. What has
 * to hold: one row per thing, columns that line up, a status line that counts
 * what is drawn, and a key line that prints only keys the panel takes.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { releaseAll } from "../harness";
import { composerScene, hintWords } from "../stage/composer";
import { logScene } from "../stage/log";
import { pickMode } from "../../src/plugins/core/lib/composer/mode";
import { HOST } from "../../src/plugins/registry";
import { agentToolNames } from "../../src/plugins/core/lib/plugin/surfaces";
import { guardrailsStore } from "../../src/plugins/guardrails/lib/store";
import { stageProjectStore } from "../fixtures/projects";
import { SESSION_TREE_FIXTURE, SESSION_TREE_LEAF_ID } from "../fixtures/tree";
import { guardrailsScene } from "../fixtures/guardrails";
import { SESSION_ITEMS } from "../fixtures/scenes/photo-strip";
import type { Screen } from "../harness";

afterEach(releaseAll);

/** A row's cells, read at one height: everything printed on that line. */
const rowAt = (screen: Screen, y: number) =>
  screen
    .inkOf("")
    .filter((entry) => Math.abs(entry.y - y) <= 6)
    .sort((a, b) => a.x - b.x);

const AGE = /^(now|\d+[smhdw])$/;
const ageOf = (text: string): number => {
  if (text === "now") return 0;
  const n = Number.parseInt(text, 10);
  const unit =
    { s: 1, m: 60, h: 3_600, d: 86_400, w: 604_800 }[text.slice(-1)] ?? 0;
  return n * unit;
};

describe("the plugins panel — the app describing itself", () => {
  test("one row per plugin the build is made of, with what it registers", async () => {
    const screen = await composerScene({ mode: pickMode("plugins", "") });
    // The list is the build: every row is a plugin of this app, in the order the
    // registry loads them, and a plugin that registers nothing cannot hide a row.
    // A row prints its folder's name and its category, and its title beside them.
    const names = new Set(HOST.plugins.map((p) => p.name));
    const rows = screen
      .words()
      .filter((word) => /^[a-z0-9-]+ · [a-z ]+$/.test(word))
      .map((word) => word.split(" · ")[0]!);
    expect(rows.length).toBeGreaterThan(8);
    for (const row of rows) expect(names.has(row)).toBe(true);
    const order = HOST.plugins
      .map((p) => p.name)
      .filter((name) => rows.includes(name));
    expect(rows).toEqual(order);
  });

  test("its status line counts itself and says when a switch lands", async () => {
    const screen = await composerScene({ mode: pickMode("plugins", "") });
    const status = hintWords(screen)[0]!;
    expect(status).toContain(`${String(HOST.plugins.length)} plugins`);
    // A plugin's slots are the app's shape: switching is the next start's business,
    // and the panel says so rather than leaving it to be discovered.
    expect(status).toContain("switches apply at the next start");
    expect(hintWords(screen)).toEqual(
      expect.arrayContaining(["Switch", "Close"]),
    );
  });
});

describe("the projects panel", () => {
  test("a row is a name, the folder it sits in, and its figures — never the path twice", async () => {
    stageProjectStore();
    const screen = await composerScene({ mode: pickMode("projects", "") });
    expect(screen.says("mu")).toBe(true);
    expect(screen.says("~/Projects/gpuix-apps")).toBe(true);
    // The full path is not restated under the name.
    expect(screen.says("~/Projects/gpuix-apps/mu")).toBe(false);

    const label = screen.inkOf("mu")[0]!;
    const cells = rowAt(screen, label.y).map((entry) => entry.text);
    // name, place, count, age: the age is the last figure on the row, and the
    // count of chats is a count, not a clock.
    expect(cells[0]).toBe("mu");
    expect(cells[1]).toMatch(/^~?\//);
    expect(cells.at(-1)).toMatch(AGE);
    expect(Number(cells[2])).toBeGreaterThan(0);
  });

  test("its status line counts the projects on the machine", async () => {
    stageProjectStore();
    const screen = await composerScene({ mode: pickMode("projects", "") });
    expect(hintWords(screen)[0]).toMatch(/\d+ projects/);
    expect(hintWords(screen)).toEqual(
      expect.arrayContaining(["Open", "Close"]),
    );
  });
});

describe("the change stack", () => {
  test("one row per change, newest first, its age a relative word", async () => {
    const screen = await composerScene({ mode: pickMode("changes", "") });
    const ink = screen.inkOf("");
    const ages = ink
      .filter((entry) => AGE.test(entry.text.trim()))
      .sort((a, b) => a.y - b.y)
      .map((entry) => ageOf(entry.text.trim()));
    expect(ages.length).toBeGreaterThan(3);
    // An age is always a relative word — a reader of a change stack is asking how
    // long ago, not what the calendar said. No absolute date is printed anywhere.
    for (const entry of ink)
      expect(entry.text).not.toMatch(/\b(20\d\d|Jan|Feb|Mar)\b/);
    // The working copy stands at the top of the stack, where the next change is.
    const top = ink
      .filter((entry) => AGE.test(entry.text.trim()))
      .sort((a, b) => a.y - b.y)[0]!;
    expect(top.text.trim()).toBe("now");
  });
});

describe("the conversation tree", () => {
  test("one row per point, the current one marked, and the count of both", async () => {
    const screen = await composerScene({
      mode: pickMode("tree", ""),
      tree: { tree: SESSION_TREE_FIXTURE, leafId: SESSION_TREE_LEAF_ID },
    });
    const status = hintWords(screen)[0]!;
    expect(status).toMatch(/^\d+ of \d+ points/);
    // The point the conversation stands at is said in words, not only by colour.
    expect(screen.says("here")).toBe(true);
    expect(hintWords(screen)).toEqual(
      expect.arrayContaining(["Jump here", "Filter", "Close"]),
    );
  });

  test("the leaf's own text is the row that carries the mark", async () => {
    const screen = await composerScene({
      mode: pickMode("tree", ""),
      tree: { tree: SESSION_TREE_FIXTURE, leafId: SESSION_TREE_LEAF_ID },
    });
    const here = screen.inkOf("here")[0]!;
    // The mark never stands alone: the line it marks carries the point's own text,
    // so a reader knows which point the conversation stands at.
    const row = rowAt(screen, here.y);
    expect(row.length).toBeGreaterThan(1);
    const text = row.find(
      (entry) => entry.text.trim() !== "here" && entry.text.length > 20,
    );
    expect(text ?? null).not.toBeNull();
    expect(here.y).toBeCloseTo(text!.y, 0);
  });
});

describe("the looks panels", () => {
  test("the schemes are listed, counted, and applied by the key the panel prints", async () => {
    const screen = await composerScene({ mode: pickMode("theme", "") });
    expect(screen.says("Light")).toBe(true);
    expect(screen.says("Nightsky")).toBe(true);
    expect(hintWords(screen)[0]).toMatch(/\d+ themes/);
    expect(hintWords(screen)).toEqual(
      expect.arrayContaining(["Apply", "Close"]),
    );
  });

  test("the accent list starts from the scheme's own colour", async () => {
    const screen = await composerScene({ mode: pickMode("accent", "") });
    expect(screen.says("Scheme default")).toBe(true);
    expect(hintWords(screen)[0]).toMatch(/\d+ accent colours/);
    const first = screen.inkOf("Scheme default")[0]!;
    const blue = screen.inkOf("Blue")[0]!;
    expect(first.y).toBeLessThan(blue.y);
  });

  test("picking a scheme paints a different window", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mu-schemes-"));
    const capture = async (
      scheme: "light" | "nightsky",
    ): Promise<Uint8Array> => {
      const screen = await logScene(
        { items: SESSION_ITEMS.slice(0, 4) },
        { scheme },
      );
      const path = join(dir, `${scheme}.png`);
      await screen.shot(path);
      screen.unmount();
      return Bun.file(path).bytes();
    };
    const light = await capture("light");
    const nightsky = await capture("nightsky");
    expect(light.some((byte, i) => nightsky[i] !== byte)).toBe(true);
  });
});

describe("the guardrails panel", () => {
  test("one row per domain, with the rules it holds and whether it is armed", async () => {
    guardrailsScene();
    const screen = await composerScene({ mode: pickMode("guardrails", "") });
    expect(screen.says("package-manager")).toBe(true);
    expect(screen.says("3 rules")).toBe(true);
    const status = hintWords(screen)[0]!;
    expect(status).toMatch(/(\d+) of (\d+) domains armed/);
    expect(status).toMatch(/parser (ready|warming|failed)/);
  });

  test("arming is the panel's switch: the key flips the row and the panel stays", async () => {
    guardrailsScene();
    const screen = await composerScene({ mode: pickMode("guardrails", "") });
    expect(hintWords(screen)).toEqual(expect.arrayContaining(["Arm", "Close"]));
    const statusBefore = hintWords(screen)[0]!;
    const armed = (text: string) => Number(/(\d+) of/.exec(text)![1]);
    const before = armed(statusBefore);

    // The row under the cursor is flipped — and the panel does not close on it,
    // because a switch is read again, not chosen once.
    await screen.press("enter");
    const after = armed(hintWords(screen)[0]!);
    expect(Math.abs(after - before)).toBe(1);
    expect(screen.says("package-manager")).toBe(true);

    // A guardrails tool never arms or disarms: the switch belongs to the person.
    const tools = agentToolNames(HOST)
      .filter((name) => name.startsWith("guardrails-"))
      .sort();
    expect(tools).toEqual([
      "guardrails-coverage",
      "guardrails-fixture-update",
      "guardrails-test",
    ]);
    for (const name of tools)
      expect(name).not.toMatch(/arm|disarm|enable|disable/);
    void guardrailsStore.isArmed("package-manager");

    // And the flip is undone here, so a test never changes what the app enforces.
    await screen.press("enter");
    expect(armed(hintWords(screen)[0]!)).toBe(before);
  });
});
