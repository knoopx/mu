/**
 * The operation log panel.
 *
 * jj records every change it makes to the repo as an operation, and this panel
 * is that record read three ways — the operations, the files one operation
 * moved, the patch of one file — under a keymap that either moves a cursor or
 * rewinds the repo. The reads are useOplogData's; this file wires them to the
 * cursor, the keys and the one write the panel runs itself.
 *
 * Restoring is that write, and the one it may run alone: jj's own answer to a
 * mistake is an operation, and standing on the operation you want back is the
 * whole reason the panel exists. A change's describes and splits go to the agent
 * instead, because those are the tools the agent holds.
 */
import { useCallback, useEffect, useState } from "react";
import { useAdwaita, type ToastFn } from "adwaita-gpuix";
import { useGpuixRequired, type PublicInstance } from "@gpuix/react";
import type { EventPayload } from "@gpuix/native";
import { keyOf, modsOf } from "../../core/lib/ui/keyEvents";
import {
  isBareKey,
  matchPanelKey,
  runFileKey,
  runOplogKey,
} from "../lib/keymap";
import { redoOperation, restoreOperation, undoOperation } from "../lib/repo";
import { useOplogData } from "./useOplogData";
import { useRepoWrites } from "./useRepoWrites";
import { usePanelListRefs } from "./usePanelListRefs";
import { usePanelNav, type PanelNavSource } from "./usePanelNav";
import type { OpPatchFile } from "../lib/opPatch";
import type { FilePanelFocus, OplogRow } from "../types";

export interface OplogPanelOptions {
  cwd: string;
  toast: ToastFn;

  enabled: boolean;
}

export interface OplogPanelState {
  rows: readonly OplogRow[];
  sel: number;
  focus: FilePanelFocus;

  files: readonly OpPatchFile[];
  fileSel: number;
  patch: string;

  error: string | null;

  stackListRef: { current: PublicInstance | null };
  fileListRef: { current: PublicInstance | null };
  diffRef: { current: PublicInstance | null };

  selectOp(index: number): void;
  selectFile(index: number): void;
  setFocus(focus: FilePanelFocus): void;

  onKey(event: EventPayload): boolean;
}

export function useOplogPanel(options: OplogPanelOptions): OplogPanelState {
  const { cwd, toast, enabled } = options;
  const renderer = useGpuixRequired();
  const rowHeight = useAdwaita().control.rowHeight;

  const refs = usePanelListRefs(renderer);
  const data = useOplogData({ cwd, enabled });
  const [focus, setFocus] = useState<FilePanelFocus>("stack");

  const nav = usePanelNav({
    source: {
      rowCount: () => data.live().rows.length,
      rowSel: () => data.live().sel,
      selectRow: data.selectOp,
      fileCount: () => data.live().files.length,
      fileSel: () => data.live().fileSel,
      selectFile: data.selectFile,
    } satisfies PanelNavSource,
    listRef: refs.stackListRef,
    renderer,
    rowHeight,
  });

  /** With no files under the cursor there is no right half to hold the focus. */
  useEffect(() => {
    if (data.files.length === 0) setFocus("stack");
  }, [data.files.length]);

  const { runMutation } = useRepoWrites({
    toast,
    refresh: data.refresh,
    setError: data.setError,
  });

  /**
   * `u` and `U` are jj's own undo and redo and need no operation under the
   * cursor. `r` does: it restores to the operation the cursor stands on, and
   * the newest operation is where the repo already stands, so restoring to it
   * says so instead of writing a no-op into the log it is reading.
   */
  const oplogAction = useCallback(
    (id: string): boolean => {
      if (id === "undo") {
        void runMutation(undoOperation);
        return true;
      }
      if (id === "redo") {
        void runMutation(redoOperation);
        return true;
      }
      if (id !== "restore") return false;

      const live = data.live();
      const op = live.rows[live.sel]?.op;
      if (op === undefined) return false;
      if (live.sel === 0) {
        toast("Already at the current operation", { type: "info" });
        return true;
      }
      void runMutation(() => restoreOperation(op));
      return true;
    },
    [data, runMutation, toast],
  );

  const onKey = useCallback(
    (event: EventPayload): boolean => {
      const key = keyOf(event);
      const mods = modsOf(event);

      const actionsOpen = isBareKey(mods);
      const id = matchPanelKey("oplog", focus, key, mods);
      if (focus === "stack")
        return runOplogKey(id, {
          rowCount: data.rows.length,
          actionsOpen,
          canFocusFiles: data.live().files.length > 0,
          nav: nav.goList,
          focusFiles: () => setFocus("files"),
          first: () => data.selectOp(0),
          last: () => data.selectOp(data.rows.length - 1),
          run: oplogAction,
        });

      // An operation's files are history: nothing is inserted, split or
      // discarded out of them, so only the cursor and the scroll answer.
      return runFileKey(id, {
        actionsOpen,
        nav: nav.goFile,
        focusStack: () => setFocus("stack"),
        scroll: (down) => refs.scrollDiff(down),
        pick: () => false,
        run: () => false,
      });
    },
    [data, focus, nav, oplogAction, refs],
  );

  return {
    rows: data.rows,
    sel: data.sel,
    focus,
    files: data.files,
    fileSel: data.fileSel,
    patch: data.patch,
    error: data.error,
    stackListRef: refs.stackListRef,
    fileListRef: refs.fileListRef,
    diffRef: refs.diffRef,
    selectOp: data.selectOp,
    selectFile: data.selectFile,
    setFocus,
    onKey,
  };
}
