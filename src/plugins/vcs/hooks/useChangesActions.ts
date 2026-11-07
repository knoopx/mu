/**
 * What an action key does to the selection.
 *
 * The panel's action keys are opened by a bare key press and named by an id:
 * `d` describes, `s` splits, `p` pushes a bookmark. Half of them are writes the
 * panel runs itself, and the two the agent is better at — describe and split —
 * are handed over as an instruction, so they arrive as a tool row the reader
 * can see.
 */
import { useCallback } from "react";
import type { ToastFn } from "adwaita-gpuix";
import {
  bookmarkNamesFor,
  listBookmarks,
  openFileInEditor,
  restoreFile,
} from "../lib/repo";
import {
  describeInstruction,
  splitFilesInstruction,
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

  /** the changes ticked for a describe */
  checked: ReadonlySet<string>;

  enterMoveMode(): void;
  toggleChecked(changeId: string): void;
  clearChecked(): void;
  onPickPath(path: string): void;
  onInstruction(text: string): void;
}

export interface ChangesActions {
  /** an action on the selected change; false hands the key back to the editor */
  stackAction(id: string): boolean;

  /** an action on the selected file, same bargain */
  filesAction(id: string): boolean;
}

/**
 * The stack keys, in the order they are tried. A key either names an action the
 * panel has or names nothing. (A revset key is answered by the caller: it opens
 * an overlay and needs no change selected.)
 */
interface StackActionContext {
  change: Change;

  openBookmark(changeId: string): void;
  mutate(call: (changeId: string) => Promise<string>): void;
  describe(): boolean;
  split(): void;
  select(): void;
  push(): void;
  move(): void;
}

function stackActionOf(id: string, ctx: StackActionContext): boolean {
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
  if (id === "move") {
    ctx.move();
    return true;
  }
  return false;
}

/** The file keys: how the selected file is opened, split or thrown away. */
interface FileActionContext {
  open(): void;
  splitFiles(): void;
  splitHunks(): void;
  discard(): void;
}

function fileActionOf(id: string, ctx: FileActionContext): boolean {
  if (id === "open") {
    ctx.open();
    return true;
  }
  if (id === "split-file") {
    ctx.splitFiles();
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

/** What a describe asks for, in the notice the panel gives back. */
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
    enterMoveMode,
    toggleChecked,
    clearChecked,
    onPickPath,
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

  /** A describe takes what is ticked, or the change the cursor is on. */
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
        openBookmark: overlay.openBookmark,
        mutate: (mutate) => {
          void runMutation(() => mutate(change.change_id));
        },
        describe: runDescribe,
        split: (): void => {
          onInstruction(
            splitFilesInstruction(change.change_id, change.description),
          );
          sentToAgent(
            `Splitting ${change.change_id.slice(0, SHORT_CHANGE_ID)}`,
          );
        },
        select: (): void => toggleChecked(change.change_id),
        push: (): void => {
          void pushBookmarks();
        },
        move: enterMoveMode,
      });
    },
    [
      enterMoveMode,
      onInstruction,
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
        if (file !== undefined) onPickPath(file.path);
        return true;
      }
      const change = selectedChange();
      if (change === undefined || file === undefined) return false;
      return fileActionOf(id, {
        open: (): void => {
          openFileInEditor(file.path);
          toast(`Opening ${file.path} in the editor`, { type: "info" });
        },
        splitFiles: (): void => {
          onInstruction(
            splitFilesInstruction(change.change_id, change.description, [
              file.path,
            ]),
          );
          sentToAgent(`Splitting ${file.path}`);
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
      onPickPath,
      runMutation,
      selectedChange,
      sentToAgent,
      toast,
    ],
  );

  return { stackAction, filesAction };
}
