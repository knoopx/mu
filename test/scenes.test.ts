/**
 * The scenes carry their own conversations.
 *
 * Every scene in `test/fixtures/scenes` is the evidence a UI test argues from:
 * its own prompts, its own tool calls, its own answer. Two scenes reading the
 * same transcript prove nothing about either of them, and a scene whose figures
 * are read off the wall clock is a figure that moves. So the invariants that used
 * to be graded over story files are graded here, over the data itself: one
 * conversation per scene, ids that do not repeat, rows that run forwards in time,
 * and a moment of its own for every scene to be read at.
 */

import { describe, expect, test } from "bun:test";
import type { TranscriptItem } from "../src/plugins/core/lib/agent/transcriptState";
import { clockOf, T0 } from "./fixtures/turn";

import { AGENT_JOB_ITEMS } from "./fixtures/scenes/agent-jobs";
import { ASK_FORK_ITEMS } from "./fixtures/scenes/ask-fork";
import {
  CHANGE_STACK_ITEMS,
  OPLOG_ITEMS,
} from "./fixtures/scenes/change-stack";
import { CODEMODE_ITEMS } from "./fixtures/scenes/codemode-run";
import { COMPOSER_DRAFT_ITEMS } from "./fixtures/scenes/composer-ring";
import { DOCUMENT_ITEMS } from "./fixtures/scenes/documents";
import { FILE_TIDY_ITEMS } from "./fixtures/scenes/file-tidy";
import { HISTORY_ITEMS } from "./fixtures/scenes/history-tree";
import { ACCENT_ITEMS } from "./fixtures/scenes/looks-accent";
import { THEME_ITEMS } from "./fixtures/scenes/looks-rules";
import {
  MODEL_PICK_ITEMS,
  THINKING_LEVEL_ITEMS,
} from "./fixtures/scenes/model-choice";
import { PAGE_READ_ITEMS } from "./fixtures/scenes/page-read";
import { PATH_PICK_ITEMS } from "./fixtures/scenes/path-complete";
import { SESSION_ITEMS } from "./fixtures/scenes/photo-strip";
import { PICTURE_VIEW_ITEMS } from "./fixtures/scenes/picture-view";
import { PLUGIN_LIST_ITEMS } from "./fixtures/scenes/plugin-list";
import { PROJECT_SWITCH_ITEMS } from "./fixtures/scenes/project-switch";
import { PROMPT_SEARCH_ITEMS } from "./fixtures/scenes/prompt-search";
import { SESSION_PICK_ITEMS } from "./fixtures/scenes/session-name";
import { SNAPCOMPACT_ITEMS } from "./fixtures/scenes/snapcompact";
import { SEARCH_WASM_ITEMS } from "./fixtures/scenes/web-search";

/** One scene, one transcript. `photo-strip` is the hero, and the sessions scene
 *  previews it on purpose; nothing else may share. */
const SHARED = new Set(["photo strip", "sessions preview"]);

export interface Scene {
  name: string;
  items: TranscriptItem[];
}

export const SCENES: Scene[] = [
  { name: "agent jobs", items: AGENT_JOB_ITEMS },
  { name: "ask fork", items: ASK_FORK_ITEMS },
  { name: "change stack", items: CHANGE_STACK_ITEMS },
  { name: "op log", items: OPLOG_ITEMS },
  { name: "codemode run", items: CODEMODE_ITEMS },
  { name: "composer ring", items: COMPOSER_DRAFT_ITEMS },
  { name: "documents", items: DOCUMENT_ITEMS },
  { name: "file tidy", items: FILE_TIDY_ITEMS },
  { name: "history tree", items: HISTORY_ITEMS },
  { name: "accent picker", items: ACCENT_ITEMS },
  { name: "theme picker", items: THEME_ITEMS },
  { name: "model picker", items: MODEL_PICK_ITEMS },
  { name: "thinking picker", items: THINKING_LEVEL_ITEMS },
  { name: "page read", items: PAGE_READ_ITEMS },
  { name: "path completion", items: PATH_PICK_ITEMS },
  { name: "photo strip", items: SESSION_ITEMS },
  { name: "picture view", items: PICTURE_VIEW_ITEMS },
  { name: "plugin list", items: PLUGIN_LIST_ITEMS },
  { name: "project switch", items: PROJECT_SWITCH_ITEMS },
  { name: "prompt search", items: PROMPT_SEARCH_ITEMS },
  { name: "session picker", items: SESSION_PICK_ITEMS },
  { name: "snapcompact", items: SNAPCOMPACT_ITEMS },
  { name: "web search", items: SEARCH_WASM_ITEMS },
];

const stampsOf = (item: TranscriptItem): number[] => {
  const record = item as unknown as Record<string, unknown>;
  const found: number[] = [];
  for (const key of ["ts", "timestamp", "startTs", "endTs"]) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) found.push(value);
  }
  const usage = record.usage as
    | { startTs?: number; endTs?: number }
    | undefined;
  if (usage?.startTs !== undefined) found.push(usage.startTs);
  if (usage?.endTs !== undefined) found.push(usage.endTs);
  return found;
};

const firstQuestion = (items: TranscriptItem[]): string => {
  const first = items.find((item) => item.kind === "user");
  return first === undefined
    ? ""
    : String((first as unknown as { text?: string }).text ?? "");
};

const fingerprint = (items: TranscriptItem[]): string =>
  items
    .map((item) => {
      const record = item as unknown as Record<string, unknown>;
      return `${String(record.kind)}:${String(record.id)}`;
    })
    .join("|");

describe("the scenes", () => {
  test("there are scenes enough to cover the app's surfaces", () => {
    expect(SCENES.length).toBeGreaterThanOrEqual(20);
  });

  test("a scene is never an empty log", () => {
    for (const scene of SCENES) {
      expect(scene.items.length, scene.name).toBeGreaterThan(1);
      expect(
        scene.items.some((item) => item.kind === "user"),
        `${scene.name} says nothing was asked`,
      ).toBe(true);
    }
  });

  test("no two scenes share a transcript, or its opening question", () => {
    const owners = new Map<string, string>();
    const asked = new Map<string, string>();
    const shared: string[] = [];
    for (const scene of SCENES) {
      if (SHARED.has(scene.name)) continue;
      for (const [key, book] of [
        [fingerprint(scene.items), owners],
        [firstQuestion(scene.items), asked],
      ] as [string, Map<string, string>][]) {
        if (key === "") continue;
        const other = book.get(key);
        if (other !== undefined) shared.push(`${scene.name} repeats ${other}`);
        else book.set(key, scene.name);
      }
    }
    expect(shared).toEqual([]);
  });

  test("a scene is one sitting: its rows are its own, and its clock is its own", () => {
    for (const scene of SCENES) {
      const ids = scene.items.map((item) =>
        String((item as { id?: string }).id ?? ""),
      );
      expect(new Set(ids).size, `${scene.name} repeats a row id`).toBe(
        ids.length,
      );
      for (const id of ids)
        expect(id, `${scene.name} has an unnamed row`).not.toBe("");

      // A scene is one sitting. Every stamp it carries belongs to one session's
      // span: a row stamped in 1970, or a turn whose minutes were written as
      // milliseconds, is a figure the status bar would print as a lie.
      const stamps = scene.items
        .flatMap(stampsOf)
        .filter((ts) => Number.isFinite(ts));
      for (const ts of stamps) {
        expect(
          ts,
          `${scene.name} has a row outside its session`,
        ).toBeGreaterThanOrEqual(T0);
        expect(ts, `${scene.name} has a row outside its session`).toBeLessThan(
          T0 + 2 * 3_600_000,
        );
      }

      // A row's own beginning stands before its own end.
      for (const item of scene.items) {
        const record = item as unknown as Record<string, unknown>;
        const where = `${scene.name} · ${String(record.id)}`;
        const use = record.usage as
          | { startTs?: number; endTs?: number }
          | undefined;
        if (use?.startTs !== undefined && use.endTs !== undefined)
          expect(use.endTs, `${where} runs backwards`).toBeGreaterThanOrEqual(
            use.startTs,
          );
        if (
          typeof record.startTs === "number" &&
          typeof record.endTs === "number"
        )
          expect(
            record.endTs,
            `${where} runs backwards`,
          ).toBeGreaterThanOrEqual(record.startTs);
      }

      // What the person asked is asked in order — a scene may fork its work, but
      // its questions do not arrive before they were typed.
      const asked = scene.items
        .filter((item) => item.kind === "user")
        .flatMap((item) => stampsOf(item));
      for (let i = 1; i < asked.length; i++)
        expect(
          asked[i]!,
          `${scene.name} asks out of order`,
        ).toBeGreaterThanOrEqual(asked[i - 1]!);
    }
  });

  test("every scene names the moment it is read at", () => {
    for (const scene of SCENES) {
      const stamps = scene.items.flatMap(stampsOf).filter((ts) => ts >= T0);
      if (stamps.length === 0) continue;
      const last = Math.max(...stamps);
      const now = clockOf(scene.items);
      // The scene's figures are read a moment after its last row — a pinned
      // moment, not the wall clock, so the same figures hold on every read.
      expect(now - last, scene.name).toBe(1_500);
    }
  });
});
