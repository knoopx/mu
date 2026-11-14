/**
 * The README's screens, painted by the suite that describes the app.
 *
 * Every image the README shows is a frame one of these tests renders: the app
 * itself, in a headless gpuix window, with a session in it doing the thing the
 * heading claims. That is the only way a picture in this repo cannot go stale —
 * it is written by the run that grades the app, and the same test fails if the
 * frame comes out empty, the wrong size, or identical to another screen's.
 *
 * A screen is the whole window doing a job, not a component in a box: the log,
 * the panel open over the composer, the bar under it, the theme painted over all
 * of it. And one screen, one scene — the transcripts are checked for uniqueness
 * in `test/scenes.test.ts`, so no two images are the same conversation with a
 * different panel bolted on.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { releaseAll, type Screen, type StageOptions } from "../harness";
import { chatWindow, type WindowScene } from "../stage/window";
import { pickMode } from "../../src/plugins/core/lib/composer/mode";
import {
  imageViewer,
  viewPicture,
} from "../../src/plugins/core/lib/ui/imageViewer";
import { askStore } from "../../src/plugins/interaction/lib/store";

import { SESSION_ITEMS, STREAM_TURN } from "../fixtures/scenes/photo-strip";
import { AGENT_JOB_ITEMS } from "../fixtures/scenes/agent-jobs";
import { FILE_TIDY_ITEMS } from "../fixtures/scenes/file-tidy";
import { HISTORY_ITEMS } from "../fixtures/scenes/history-tree";
import { CODEMODE_ITEMS } from "../fixtures/scenes/codemode-run";
import { DOCUMENT_ITEMS } from "../fixtures/scenes/documents";
import { PAGE_READ_ITEMS } from "../fixtures/scenes/page-read";
import { CHANGE_STACK_ITEMS } from "../fixtures/scenes/change-stack";
import { PROJECT_SWITCH_ITEMS } from "../fixtures/scenes/project-switch";
import { PLUGIN_LIST_ITEMS } from "../fixtures/scenes/plugin-list";
import { SNAPCOMPACT_ITEMS } from "../fixtures/scenes/snapcompact";
import { THEME_ITEMS } from "../fixtures/scenes/looks-rules";
import { ACCENT_ITEMS } from "../fixtures/scenes/looks-accent";
import {
  PICTURE_VIEW_ITEMS,
  PICTURE_VIEW_SHOWN,
} from "../fixtures/scenes/picture-view";
import { guardrailsScene } from "../fixtures/guardrails";
import { SESSION_TREE_FIXTURE, SESSION_TREE_LEAF_ID } from "../fixtures/tree";
import { stageProjectStore } from "../fixtures/projects";
import { ASK_FORK_QUESTIONS } from "../fixtures/scenes/ask-fork";
import {
  GITHUB_REPO_ITEM,
  GITHUB_PR_ITEM,
  GITHUB_FILE_ITEM,
} from "../fixtures/github";
import {
  QUALITY_COMPLEXITY_ITEM,
  QUALITY_DUPES_ITEM,
} from "../fixtures/quality";
import { OPENUI_RENDER_ITEM, OPENUI_ANSWER } from "../fixtures/openui";
import { answer, userTurn } from "../fixtures/turn";

/** Whatever a screen left switched on, so the next screen starts from the window. */
afterEach(() => {
  imageViewer.close();
  askStore.cancel();
  releaseAll();
});

const SCREENS_DIR = join(import.meta.dir, "../..", "docs", "screens");
mkdirSync(SCREENS_DIR, { recursive: true });

/** What this run wrote, so the README can be checked against it. */
const written: string[] = [];
const frames = new Map<string, string>();
const samePicture: string[] = [];

/** The size a PNG was written at, from its IHDR; null when it is not a PNG. */
const pngSize = (
  bytes: Uint8Array,
): { width: number; height: number } | null => {
  const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < magic.length; i++) if (bytes[i] !== magic[i]) return null;
  return {
    width:
      (bytes[16]! << 24) | (bytes[17]! << 16) | (bytes[18]! << 8) | bytes[19]!,
    height:
      (bytes[20]! << 24) | (bytes[21]! << 16) | (bytes[22]! << 8) | bytes[23]!,
  };
};

/** Paint, write the frame out, and prove the frame is a real picture.
 *
 *  A solid rectangle of any colour compresses to a couple of kilobytes, so a
 *  floor on the byte count is the cheap check for "the app was actually drawn";
 *  the size check is the cheap answer to "the window was never opened at the
 *  size this screen claims"; and no two screens may fingerprint alike, which is
 *  how one transcript with a different panel bolted on used to end up as two
 *  README images. */
const frame = async (
  name: string,
  screen: Screen,
  size: { width: number; height: number },
): Promise<void> => {
  const path = join(SCREENS_DIR, `${name}.png`);
  const UNLIT = 30_000;
  const capture = async (): Promise<Uint8Array> => {
    await screen.shot(path);
    return Bun.file(path).bytes();
  };
  try {
    await screen.frame();
    let bytes = await capture();
    // Deep in a run a window can be captured before GPUI has composited its
    // first frame: the whole tree is there, the surface is empty. A pointer
    // move asks for a paint, and the frame is taken again — up to a few times,
    // keeping the largest capture. A screen still unlit after that is a real
    // failure rather than a race.
    for (let paint = 0; bytes.length < UNLIT && paint < 3; paint++) {
      await screen.moveTo(2, 2);
      await screen.frame();
      const again = await capture();
      if (again.length > bytes.length) bytes = again;
    }
    if (bytes.length > UNLIT) await Bun.write(path, bytes);
    const dims = pngSize(bytes);
    expect(dims, `${name}: not a PNG`).not.toBeNull();
    expect(dims!.width, `${name}: the window is the wrong width`).toBe(
      size.width,
    );
    expect(dims!.height, `${name}: the window is the wrong height`).toBe(
      size.height,
    );
    expect(
      bytes.length,
      `${name}: an empty frame is not a screen`,
    ).toBeGreaterThan(UNLIT);
    const print = Bun.hash(bytes).toString(16);
    const earlier = frames.get(print);
    if (earlier !== undefined)
      samePicture.push(`${name} and ${earlier} are one picture`);
    frames.set(print, name);
    written.push(name);
  } finally {
    // A screen that failed an assertion must still put its window away, or its
    // modal paints over every screen after it.
    screen.unmount();
  }
};

/** Open the window a screen is painted in.
 *
 *  Deep in a run a window can come up holding its whole tree while GPUI has
 *  composited nothing — an unlit surface, and a PNG of it is a black rectangle.
 *  The picture is taken from a fresh window in that case; a screen that stays
 *  unlit across three windows is a real failure, and `frame` says so. */
const window = async (
  scene: WindowScene,
  options: StageOptions = {},
): Promise<Screen> => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const screen = await chatWindow(scene, options);
    if (screen.painted().length > 0) return screen;
    screen.unmount();
  }
  return chatWindow(scene, options);
};

/** A screen is given the time three windows may need to come up lit. */
const screenTest = (
  name: string,
  run: () => void | Promise<void>,
  seconds = 20_000,
): void => {
  test(name, run, seconds);
};

const WINDOW = { width: 1280, height: 800 };
const TALL = { width: 1100, height: 1000 };

describe("the README's screens", () => {
  screenTest(
    "the log: a session mid-answer, the bar reading its own figures",
    async () => {
      const screen = await window({
        items: [...SESSION_ITEMS, ...STREAM_TURN],
        streaming: true,
      });
      expect(screen.words().length).toBeGreaterThan(60);
      expect(screen.says("tok/s")).toBe(true);
      await frame("log", screen, WINDOW);
    },
  );

  screenTest(
    "agent actions: the calls the agent made, in the order it made them",
    async () => {
      const screen = await window({ items: FILE_TIDY_ITEMS });
      expect(screen.words().length).toBeGreaterThan(30);
      await frame("agent-actions", screen, WINDOW);
    },
  );

  screenTest(
    "documents: an answer written as a file, read back as prose",
    async () => {
      const screen = await window({ items: DOCUMENT_ITEMS });
      expect(screen.words().length).toBeGreaterThan(15);
      await frame("documents", screen, WINDOW);
    },
  );

  screenTest("guardrails: stopped, and told why", async () => {
    const screen = await window({ items: guardrailsScene() });
    expect(screen.words().length).toBeGreaterThan(15);
    await frame("guardrails", screen, WINDOW);
  });

  screenTest(
    "panels: one open above the composer, its keys printed under it",
    async () => {
      const screen = await window({
        items: AGENT_JOB_ITEMS,
        mode: pickMode("file"),
      });
      // The band says what it takes: a file panel offers insert, open, edit and
      // delete, and counts the folder it is listing.
      const band = screen.words().join(" ");
      expect(band).toContain("Delete file");
      expect(band).toMatch(/\d+ files/);
      await frame("panels", screen, WINDOW);
    },
  );

  screenTest("questions: the fork that needs a person", async () => {
    askStore.run(ASK_FORK_QUESTIONS, undefined);
    const screen = await window({ items: HISTORY_ITEMS });
    expect(
      screen.says(
        "`legacy-python.json` has not blocked anything in nine weeks. Retire it, or keep it?",
      ),
    ).toBe(true);
    await frame("questions", screen, WINDOW);
    askStore.cancel();
  });

  screenTest("the repository: the change stack over a session", async () => {
    const screen = await window({
      items: CHANGE_STACK_ITEMS,
      mode: pickMode("changes"),
    });
    expect(screen.words().length).toBeGreaterThan(40);
    await frame("changes", screen, WINDOW);
    // The stack is read from the real repository: jj, at the size the panel needs.
  });

  screenTest("projects: every folder this app has worked in", async () => {
    stageProjectStore();
    const screen = await window({
      items: PROJECT_SWITCH_ITEMS,
      mode: pickMode("projects"),
    });
    expect(screen.says("projects")).toBe(true);
    await frame("projects", screen, WINDOW);
    // The panel lists the folders this app has worked in, read off disk: a real
    // walk of the session store, so this screen is given the time a walk needs.
  });

  screenTest(
    "the conversation tree: every point the session has stood at",
    async () => {
      const screen = await window({
        items: SESSION_ITEMS,
        mode: pickMode("tree", ""),
        tree: { tree: SESSION_TREE_FIXTURE, leafId: SESSION_TREE_LEAF_ID },
      });
      // The tree names the points and marks where the conversation stands.
      expect(screen.says("here")).toBe(true);
      expect(screen.words().length).toBeGreaterThan(20);
      await frame("sessions", screen, WINDOW);
    },
  );

  screenTest("pictures: one opened at the size it was drawn for", async () => {
    viewPicture(PICTURE_VIEW_SHOWN);
    const screen = await window({ items: PICTURE_VIEW_ITEMS });
    expect(screen.says(PICTURE_VIEW_SHOWN.title)).toBe(true);
    await frame("pictures", screen, WINDOW);
    imageViewer.close();
  });

  screenTest(
    "generative UI: a screen painted into the log, answering",
    async () => {
      const screen = await window({
        items: [
          userTurn("u-screen", "give me a picker for this, not a paragraph", 0),
          OPENUI_RENDER_ITEM,
          answer("a-screen", OPENUI_ANSWER),
        ],
      });
      expect(screen.words().length).toBeGreaterThan(20);
      await frame("generative-ui", screen, WINDOW);
    },
  );

  screenTest("the web: a page read as the page itself", async () => {
    const screen = await window({ items: PAGE_READ_ITEMS });
    expect(screen.words().length).toBeGreaterThan(40);
    await frame("web", screen, WINDOW);
  });

  screenTest("GitHub: a record whose header carries its figures", async () => {
    const screen = await window(
      { items: [GITHUB_REPO_ITEM, GITHUB_PR_ITEM, GITHUB_FILE_ITEM] },
      TALL,
    );
    expect(screen.words().length).toBeGreaterThan(20);
    await frame("github", screen, TALL);
  });

  screenTest("code quality: what the project says about itself", async () => {
    const screen = await window(
      {
        items: [
          userTurn("u-quality", "what is rotten in here, and what is dead", 0),
          QUALITY_COMPLEXITY_ITEM,
          QUALITY_DUPES_ITEM,
        ],
      },
      TALL,
    );
    expect(screen.words().length).toBeGreaterThan(40);
    await frame("code-quality", screen, TALL);
  });

  screenTest(
    "the window's own figures: a turn in flight, the bar measuring it",
    async () => {
      const screen = await window({ items: CODEMODE_ITEMS, streaming: true });
      // The bar reads the session's own figures live, and the running mark hangs
      // beside the composer rather than ending the log with a line of prose.
      expect(screen.says("tok/s")).toBe(true);
      await frame("figures", screen, WINDOW);
    },
  );

  screenTest("compaction: a span kept as pictures", async () => {
    const screen = await window({ items: SNAPCOMPACT_ITEMS });
    expect(screen.says("frames archived")).toBe(true);
    await frame("compaction", screen, WINDOW);
  });

  screenTest(
    "themes: a scheme picked, and the whole window re-drawn",
    async () => {
      const screen = await window(
        { items: THEME_ITEMS, mode: pickMode("theme") },
        { scheme: "nightsky" },
      );
      expect(screen.says("Nightsky")).toBe(true);
      await frame("themes", screen, WINDOW);
    },
  );

  screenTest("the accent list, over a window wearing the accent", async () => {
    const screen = await window(
      { items: ACCENT_ITEMS, mode: pickMode("accent") },
      { scheme: "light", accent: "orange" },
    );
    expect(screen.says("Scheme default")).toBe(true);
    await frame("accents", screen, WINDOW);
  });

  screenTest("plugins: the app describing what it is made of", async () => {
    const screen = await window({
      items: PLUGIN_LIST_ITEMS,
      mode: pickMode("plugins"),
    });
    expect(screen.says("plugins")).toBe(true);
    await frame("plugins", screen, WINDOW);
  });

  screenTest(
    "every screen is its own picture, and the README shows exactly these",
    async () => {
      expect(samePicture.join("; "), samePicture.join("; ")).toBe("");
      const text = await Bun.file(
        join(import.meta.dir, "../..", "README.md"),
      ).text();
      const shown = [...text.matchAll(/docs\/screens\/([\w-]+)\.png/g)].map(
        (m) => m[1]!,
      );
      const onDisk = readdirSync(SCREENS_DIR)
        .filter((name) => name.endsWith(".png"))
        .map((name) => name.replace(/\.png$/, ""));
      const sorted = (names: string[]) => names.slice().sort();
      expect(
        sorted(shown),
        "README images: this run wrote a different set",
      ).toEqual(sorted(written));
      expect(
        sorted(onDisk),
        "files on disk: this run wrote a different set",
      ).toEqual(sorted(written));
    },
  );
});
