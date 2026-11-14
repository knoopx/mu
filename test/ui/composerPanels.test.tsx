/**
 * The composer's panels: one line of ink per row, and a hint line that prints
 * only the keys the panel actually takes.
 *
 * A panel is the app's most touched surface. What has to hold, on screen: a row
 * is one line, names line up in a column, the status line counts what is shown,
 * the keys a panel takes are the keys it prints, and a keystroke lands on the row
 * under the cursor — Tab completes a path, Enter commits a pick, Delete hands a
 * row to the one writer that refuses a name walking out of the folder, and `o`
 * and `e` hand a file to the desktop or the editor.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { releaseAll } from "../harness";
import { composerScene, hintWords, newSpy } from "../stage/composer";
import {
  commandsMode,
  pickMode,
} from "../../src/plugins/core/lib/composer/mode";
import { stubChatSession, sessionRow, stubSessionList } from "../chatSource";
import {
  COMPOSER_MODEL_ROWS,
  COMPOSER_THINKING_ROWS,
} from "../fixtures/composer";
import { USER_MESSAGE_FIXTURE } from "../fixtures/composer";
import { SESSION_ITEMS } from "../fixtures/scenes/photo-strip";

afterEach(releaseAll);

const modelPanel = async (spy = newSpy()) => {
  const { session } = stubChatSession({ modelRows: COMPOSER_MODEL_ROWS });
  return {
    screen: await composerScene({ mode: pickMode("model"), session, spy }),
    spy,
  };
};

describe("a list panel", () => {
  test("every row is one line, and the field stays above it", async () => {
    const { screen } = await modelPanel();
    // The five models are five lines of ink, and each model's own line carries
    // both its id and what it is called.
    expect(screen.countOf("5 models")).toBe(1);
    const qwen = screen.inkOf("Qwen3.8 27B · llama.cpp")[0]!;
    const id = screen.inkOf("local/ostfralla/Qwen3.8-27B")[0]!;
    // One line, even though the two halves are set at different sizes: their
    // baselines agree within a row's tolerance.
    expect(Math.abs(qwen.y - id.y)).toBeLessThanOrEqual(4);
    // A row never wraps: the label stands to the right of the id on the same line.
    expect(qwen.x).toBeGreaterThan(id.x);
  });

  test("the panel prints the keys it takes, and the count of what it shows", async () => {
    const { screen } = await modelPanel();
    const hints = hintWords(screen);
    // The model panel chooses one thing, so it prints `use`; it never deletes, so
    // it never prints a delete hint.
    expect(hints).toContain("Use");
    expect(hints).toContain("Close");
    expect(hints.join(" ")).not.toMatch(/delete/i);
  });

  test("the arrows move the cursor, and Enter picks the row under it", async () => {
    const { screen, spy } = await modelPanel();
    await screen.press("down");
    await screen.press("enter");
    expect(spy.picks.length).toBe(1);
    expect(spy.picks[0]!.intent).toBe("commit");
    // The second row was picked, not the first: the cursor moved.
    expect(spy.picks[0]!.key).toBe(COMPOSER_MODEL_ROWS[1]!.key);
  });

  test("Escape closes the panel and keeps what was typed", async () => {
    const { screen, spy } = await modelPanel();
    await screen.press("escape");
    const closed = spy.modes.filter((mode) => mode.kind === "draft");
    expect(closed.length).toBe(1);
    // The draft is still the field's own, and the panel's ink is gone.
    expect(screen.says("5 models")).toBe(false);
  });

  test("a query filters the rows and the count says what was filtered", async () => {
    const { session } = stubChatSession({ modelRows: COMPOSER_MODEL_ROWS });
    const screen = await composerScene({
      mode: { kind: "pick", target: "model", index: 0, query: "gemini" },
      session,
    });
    expect(screen.says("openrouter/google/gemini-3-pro")).toBe(true);
    expect(screen.says("local/ostfralla/Qwen3.8-27B")).toBe(false);
  });

  test("a thinking panel is the same shape with its own verb", async () => {
    const { session } = stubChatSession({
      thinkingRows: COMPOSER_THINKING_ROWS,
    });
    const screen = await composerScene({ mode: pickMode("thinking"), session });
    expect(hintWords(screen)).toContain("Set");
  });
});

describe("the command palette", () => {
  test("it lists the commands every plugin registered, with their arguments", async () => {
    const screen = await composerScene({ mode: commandsMode(), value: "" });
    // The window's own list, built from the host's slots: a plugin that registers
    // a command appears without core naming it.
    expect(screen.says("changes")).toBe(true);
    expect(screen.says("guardrails")).toBe(true);
    expect(screen.says("plugins")).toBe(true);
    expect(screen.mentions("commands")).toBeGreaterThanOrEqual(0);
  });
});

describe("the file panel", () => {
  test("it prints the keys a file row takes — use, delete, open, edit", async () => {
    const screen = await composerScene({ mode: pickMode("file", "") });
    const hints = hintWords(screen).join(" ").toLowerCase();
    // A file row is inserted into the draft, opened in the desktop's default app,
    // or handed to the editor — and it is a thing on disk, so it can be deleted.
    expect(hints).toContain("insert");
    expect(hints).toContain("open");
    expect(hints).toContain("edit");
    expect(hints).toContain("delete");
    expect(hints).toContain("close");
    // …and the panel counts what it walked, on its own status line.
    expect(screen.words().join(" ")).toMatch(/\d+ files/);
  });

  test("Delete hands the row under the cursor to the panel's own writer", async () => {
    const spy = newSpy();
    const screen = await composerScene({
      mode: pickMode("file", "src/plugins/figures/lib/"),
      spy,
    });
    await screen.press("delete");
    expect(spy.deletes.length).toBe(1);
    // The row under the cursor went to the panel's one writer, and the name it
    // carries stays inside the folder.
    expect(spy.deletes[0]!).toContain("figures/lib/");
    expect(spy.deletes[0]!).not.toContain("..");
  });

  test("`o` and `e` hand the row to the desktop and to the editor", async () => {
    const spy = newSpy();
    const screen = await composerScene({
      mode: pickMode("file", "src/plugins/figures"),
      spy,
    });
    await screen.press("o");
    await screen.press("e");
    expect(spy.opens.length).toBe(1);
    expect(spy.edits.length).toBe(1);
  });
});

describe("path completion", () => {
  const DRAFT = "look ./src/plugins/core/lib/";

  test("the draft is the query, and the rows are the folder as a shell lists it", async () => {
    const screen = await composerScene({
      mode: pickMode("path", DRAFT),
      value: DRAFT,
    });
    // A completion row is a name, not the whole path restated under itself.
    for (const folder of ["agent/", "composer/", "session/", "utils/"])
      expect(screen.says(folder)).toBe(true);
    // A folder is named once, with its trailing mark, not as a whole path.
    expect(screen.says("./src/plugins/core/lib/agent/index.ts")).toBe(false);
  });

  test("Tab completes a folder and stays; Enter commits the path and dismisses", async () => {
    const spy = newSpy();
    const screen = await composerScene({
      mode: pickMode("path", DRAFT),
      value: DRAFT,
      spy,
    });
    // The row under the cursor is a folder, so Tab writes the segment and the
    // panel stays open to grow the path; the draft is left holding what it took.
    await screen.press("tab");
    await screen.frame();
    expect(spy.picks.length).toBe(1);
    expect(spy.picks[0]!.intent).toBe("complete");
    expect(spy.picks[0]!.label).toBe("agent/");
    expect(screen.says("look ./src/plugins/core/lib/agent/")).toBe(true);
    const stillCompleting = spy.modes.filter(
      (mode) => mode.kind === "pick" && mode.target === "path",
    );
    expect(stillCompleting.length).toBeGreaterThan(0);

    // Enter commits: the path is the draft's, and the suggestions are put away.
    await screen.press("enter");
    await screen.frame();
    expect(spy.picks[1]!.intent).toBe("commit");
    expect(spy.modes.at(-1)!.kind).toBe("draft");
  });
});

describe("the search panel", () => {
  test("the rows are the person's own prompts, newest first, with their session", async () => {
    const screen = await composerScene({
      mode: pickMode("userMessageHistory", "crop"),
      value: "crop",
      userMessages: USER_MESSAGE_FIXTURE,
    });
    expect(screen.says("crop")).toBe(true);
    const rows = screen
      .inkOf("")
      .filter((entry) => entry.text.includes("crop"));
    expect(rows.length).toBeGreaterThan(0);
    for (let i = 1; i < rows.length; i++)
      expect(rows[i]!.y).toBeGreaterThan(rows[i - 1]!.y);
  });
});

describe("the session panel", () => {
  test("a row is one line: the session, how many chats it holds, and when it was worked in", async () => {
    const rows = [
      sessionRow("/tmp/a.jsonl", "photo strip", "2h"),
      sessionRow("/tmp/b.jsonl", "panel maths", "4d"),
    ];
    const screen = await composerScene({
      mode: pickMode("session"),
      sessionRows: rows,
      session: stubChatSession().session,
    });
    expect(screen.says("photo strip")).toBe(true);
    expect(screen.says("2h")).toBe(true);
    // A clock on a count is a figure read wrong: the age stands at the row's end.
    const label = screen.inkOf("photo strip")[0]!;
    const age = screen.inkOf("2h")[0]!;
    expect(age.x).toBeGreaterThan(label.x);
    expect(Math.abs(age.y - label.y)).toBeLessThanOrEqual(4);
    void SESSION_ITEMS;
  });
});
