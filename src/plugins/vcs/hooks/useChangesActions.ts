/**
 * PROBE MARKER
 */
import { useCallback } from "react";
import type { ToastFn } from "adwaita-gpuix";
import {
  bookmarkNamesFor,
  listBookmarks,
  restoreFile,
  splitFileChange,
} from "../lib/repo";
import { openPanelFile } from "../lib/fileOpen";
import {
  describeInstruction,
  splitChangeInstruction,
  splitHunksInstruction,
} from "../lib/instructions";
import { SHORT_CHANGE_ID } from "../constants";
import { STACK_MUTATIONS } from "../lib/keymap";
import { type Change } from "adwaita-gpuix";
import type { ChangeWrites } from "./useChangeWrites";
import type { ChangesOverlay } from "./useChangesOverlay";
import type { StackData } from "./useChangeStackData";

export interface ChangesActionsOptions {
  toast: ToastFn;
  data: StackData;
  writes: ChangeWrites;
  overlay: ChangesOverlay;

  checked: ReadonlySet<string>;

  toggleChecked(changeId: string): void;
  clearChecked(): void;

  onPickText(text: string): void;

  onInstruction(text: string): void;
}

export interface ChangesActions {
  stackAction(id: string): boolean;

  filesAction(id: string): boolean;
}

interface StackActionContext {
  change: Change;

  insert(): void;
  openBookmark(changeId: string): void;
  mutate(call: (changeId: string) => Promise<string>): void;
  describe(): boolean;
  split(): void;
  select(): void;
  push(): void;
}

function stackActionOf(id: string, ctx: StackActionContext): boolean {
  if (id === "pick") {
    ctx.insert();
    return true;
  }
  const mutate = STACK_MUTATIONS[id];
  if (mutate !== undefined) {
    ctx.mutate(mutate);
    return true;
  }
  if (id === "bookmark") {
    ctx.openBookmark(ctx.change.change_id);
    return true;
  }
  if (id === "describe") return ctx.describe();
  if (id === "split") {
    ctx.split();
    return true;
  }
  if (id === "select") {
    ctx.select();
    return true;
  }
  if (id === "push") {
    ctx.push();
    return true;
  }
  return false;
}

interface FileActionContext {
  open(): void;

  edit(): void;

  split(): void;

  splitHunks(): void;

  discard(): void;
}

function fileActionOf(id: string, ctx: FileActionContext): boolean {
  if (id === "open") {
    ctx.open();
    return true;
  }
  if (id === "edit") {
    ctx.edit();
    return true;
  }
  if (id === "split") {
    ctx.split();
    return true;
  }
  if (id === "split-hunk") {
    ctx.splitHunks();
    return true;
  }
  if (id === "discard") {
    ctx.discard();
    return true;
  }
  return false;
}

function describeNotice(targets: readonly string[]): string {
  return targets.length === 1
    ? `Describing ${targets[0]?.slice(0, SHORT_CHANGE_ID)}`
    : `Describing ${String(targets.length)} changes`;
}

export function useChangesActions(
  options: ChangesActionsOptions,
): ChangesActions {
  const {
    toast,
    data,
    writes,
    overlay,
    checked,
    toggleChecked,
    clearChecked,
    onPickText,
    onInstruction,
  } = options;
  const { selectedChange, runMutation, sentToAgent } = writes;

  const descriptionOf = useCallback(
    (changeId: string): string => {
      const change = data.rows.find((row) => row.change_id === changeId);
      return change?.description ?? "";
    },
    [data.rows],
  );

  const describeTargets = useCallback((): string[] => {
    const ids = Array.from(checked);
    if (ids.length > 0) return ids;
    const change = selectedChange();
    return change === undefined ? [] : [change.change_id];
  }, [checked, selectedChange]);

  const runDescribe = useCallback((): boolean => {
    const targets = describeTargets();
    if (targets.length === 0) return false;
    onInstruction(describeInstruction(targets, targets.map(descriptionOf)));
    sentToAgent(describeNotice(targets));
    clearChecked();
    return true;
  }, [
    clearChecked,
    describeTargets,
    descriptionOf,
    onInstruction,
    sentToAgent,
  ]);

  const pushBookmarks = useCallback(async (): Promise<void> => {
    const change = selectedChange();
    if (change === undefined) return;
    const bookmarks = await listBookmarks();
    const names = bookmarkNamesFor(bookmarks, change.change_id);
    if (names.length === 0) {
      toast(`No bookmarks on ${change.change_id.slice(0, 8)}`, {
        type: "warning",
      });
      return;
    }
    const { pushBookmarks: push } = await import("../lib/repo");
    await runMutation(async () => await push(names));
  }, [runMutation, selectedChange, toast]);

  const stackAction = useCallback(
    (id: string): boolean => {
      const change = selectedChange();
      if (change === undefined) return false;
      return stackActionOf(id, {
        change,
        insert: (): void => {
          onPickText(change.change_id.slice(0, SHORT_CHANGE_ID));
        },
        openBookmark: overlay.openBookmark,
        mutate: (mutate) => {
          void runMutation(() => mutate(change.change_id));
        },
        describe: runDescribe,
        split: (): void => {
          onInstruction(
            splitChangeInstruction(change.change_id, change.description),
          );
          sentToAgent(
            `Splitting ${change.change_id.slice(0, SHORT_CHANGE_ID)}`,
          );
        },
        select: (): void => toggleChecked(change.change_id),
        push: (): void => {
          void pushBookmarks();
        },
      });
    },
    [
      onInstruction,
      onPickText,
      overlay.openBookmark,
      pushBookmarks,
      runDescribe,
      runMutation,
      selectedChange,
      sentToAgent,
      toggleChecked,
    ],
  );

  const filesAction = useCallback(
    (id: string): boolean => {
      const live = data.live();
      const file = live.files[live.fileSel];
      if (id === "pick") {
        if (file !== undefined) onPickText(file.path);
        return true;
      }
      const change = selectedChange();
      if (change === undefined || file === undefined) return false;
      return fileActionOf(id, {
        open: (): void => {
          openPanelFile(file.path, "default app", toast);
        },
        edit: (): void => {
          openPanelFile(file.path, "editor", toast);
        },
        split: (): void => {
          void runMutation(() => splitFileChange(change.change_id, file.path));
        },
        splitHunks: (): void => {
          onInstruction(
            splitHunksInstruction(
              change.change_id,
              change.description,
              file.path,
            ),
          );
          sentToAgent(`Splitting hunks of ${file.path}`);
        },
        discard: (): void => {
          void runMutation(() => restoreFile(change.change_id, file.path));
        },
      });
    },
    [
      data,
      onInstruction,
      onPickText,
      runMutation,
      selectedChange,
      sentToAgent,
      toast,
    ],
  );

  return { stackAction, filesAction };
}
