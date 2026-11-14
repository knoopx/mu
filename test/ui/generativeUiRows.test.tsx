/**
 * The agent answering with a screen instead of a paragraph.
 *
 * A program in the log is drawn as widgets, not as source: a header, a filter, a
 * table of rows, a stepper, a button. And a screen written inline in a reply is
 * drawn too, with its controls standing in the message where they were written.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { releaseAll } from "../harness";
import { logScene } from "../stage/log";
import {
  OPENUI_LIST_ITEM,
  OPENUI_RENDER_ITEM,
  OPENUI_STATE_ITEM,
  OPENUI_VALIDATE_ITEM,
  REPLY_SCREEN_TEXT,
  REFERENCE_SCREEN_TEXT,
  seedReferenceScreen,
  seedReplyScreen,
} from "../fixtures/openui";

afterEach(releaseAll);

describe("a screen the agent rendered", () => {
  test("its header says what the program is, not what it looks like", async () => {
    const screen = await logScene({ items: [OPENUI_RENDER_ITEM] });
    const header = screen.ink("screen · 954 chars · 8 statements · 15 drawn");
    expect(header.text).toContain("954 chars");
    expect(header.text).toContain("8 statements");
    expect(header.text).toContain("15 drawn");
  });

  test("the program is drawn as the widgets it names", async () => {
    const screen = await logScene({ items: [OPENUI_RENDER_ITEM] });
    expect(screen.says("Split this change")).toBe(true);
    expect(screen.says("The files this change moved")).toBe(true);
    // A picker is a picker: its choices are on screen, one per option.
    expect(screen.says("Only the big ones")).toBe(true);
    expect(screen.says("All")).toBe(true);
    // A table is a table: a header line and one row per record.
    expect(screen.says("src/plugins/vcs/lib/ops.ts")).toBe(true);
    expect(screen.says("164")).toBe(true);
    // And the action it offers is a button, with the number it will act on.
    expect(screen.says("Split it")).toBe(true);
    expect(screen.says("commits to cut")).toBe(true);
  });

  test("a parse the agent checked before committing is said once", async () => {
    const screen = await logScene({ items: [OPENUI_VALIDATE_ITEM] });
    expect(screen.says("openui-validate")).toBe(true);
    expect(screen.mentions("openui-validate")).toBe(1);
  });

  test("the state read back after a person used the screen shows what they left", async () => {
    const screen = await logScene({ items: [OPENUI_STATE_ITEM] });
    expect(
      screen.ink("screen · 8 statements · 9 components · 1 waiting").text,
    ).toContain("1 waiting");
    // The bindings a person moved are shown as values, not described in prose.
    expect(screen.says("$show")).toBe(true);
    expect(screen.says("$count")).toBe(true);
    // Every component the program named is listed with whether it drew.
    expect(screen.countOf("drawn")).toBeGreaterThanOrEqual(9);
  });

  test("a list of programs names each one, and which is showing", async () => {
    const screen = await logScene({ items: [OPENUI_LIST_ITEM] });
    expect(screen.says("screen")).toBe(true);
    expect(screen.mentions("openui-list")).toBe(1);
  });
});

describe("a screen written into the reply itself", () => {
  test("a program written against the reference plugin draws here as it is named there", async () => {
    seedReferenceScreen();
    const screen = await logScene({
      items: [
        {
          kind: "assistant",
          id: "a-release",
          text: REFERENCE_SCREEN_TEXT,
          streaming: false,
          stopReason: "stop",
        },
      ],
    });
    expect(screen.says("Where 0.15 stands")).toBe(true);
    // A board gathers its items into the columns their own status names.
    expect(screen.says("Name the parts")).toBe(true);
    expect(screen.says("Retire the old names")).toBe(true);
    // A dated plan prints its phases, and the bar of each sits between its dates.
    expect(screen.says("Ship 0.15")).toBe(true);
    // Shares of one whole, counted in the unit the program named, each part
    // named under the bar without a second list.
    expect(screen.says("findings")).toBe(true);
    expect(screen.says("tests")).toBe(true);
    expect(screen.says("types")).toBe(true);
    // And the screen names where its figures came from.
    expect(screen.says("out/report.csv")).toBe(true);
  });

  test("the fence is drawn as a screen, not as code", async () => {
    seedReplyScreen();
    const screen = await logScene({
      items: [
        {
          kind: "assistant",
          id: "a-split",
          text: REPLY_SCREEN_TEXT,
          streaming: false,
          stopReason: "stop",
        },
      ],
    });
    // The prose around the block is still prose…
    expect(screen.says("Three ways to split the change")).toBe(true);
    // …and the block is widgets: its heading, its picker, its stepper, its buttons.
    expect(screen.says("Three ways to split this change")).toBe(true);
    expect(screen.says("Files per commit")).toBe(true);
    expect(screen.says("Keep the parser in one commit")).toBe(true);
    expect(screen.says("Two commits, parser whole")).toBe(true);
    expect(screen.says("Split by area")).toBe(true);
    // The program's source never reaches the page: no fence, no assignment.
    expect(screen.says("```ui")).toBe(false);
    expect(screen.says("root = Screen([head, ask, run])")).toBe(false);
  });
});
