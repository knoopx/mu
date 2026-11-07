/**
 * The changes panel.
 *
 * The panel is the repo read three ways — the changes of a revset, the files of
 * one change, the patch of one file — under a keymap that either acts itself
 * or asks the agent to act. What it holds is split by what it holds: the reads
 * in useChangeStackData, the cursor in useChangesSelection, the overlays in
 * useChangesOverlay, move mode in useChangesMove, the action keys in
 * useChangesActions. This file only wires them to one another and to the keys.
 */
import { useCallback } from "react";
import { useAdwaita, type GraphNode, type ToastFn } from "adwaita-gpuix";
import { useGpuixRequired, type PublicInstance } from "@gpuix/react";
import type { EventPayload } from "@gpuix/native";
import {
  isBareKey,
  matchPanelKey,
  runFileKey,
  runMoveKey,
  runStackKey,
} from "../lib/keymap";
import { keyOf, modsOf } from "../../core/lib/ui/keyEvents";
import { type Change, type FileChange } from "adwaita-gpuix";
import { FilePanelFocus, PanelMode, RevsetDef } from "../types";
import { useChangeGraph } from "./useChangeGraph";
import { useChangeStackData } from "./useChangeStackData";
import { useChangeWrites } from "./useChangeWrites";
import { useChangesActions } from "./useChangesActions";
import { useChangesMove } from "./useChangesMove";
import { useChangesNav } from "./useChangesNav";
import { useChangesOverlay, type PanelOverlay } from "./useChangesOverlay";
import { useChangesPanelRefs } from "./useChangesPanelRefs";
import { useChangesSelection } from "./useChangesSelection";

/**
 * What the panel needs from the app. onInstruction hands the text of a write to
 * the agent: the panel never runs a describe or a split itself, it asks.
 */
export interface ChangesPanelOptions {
  cwd: string;
  toast: ToastFn;

  enabled: boolean;

  onPickPath: (path: string) => void;

  onInstruction(text: string): void;
}

export interface ChangesPanelState {
  revsets: readonly RevsetDef[];
  currentRevset: string;
  rows: Change[];
  sel: number;
  focus: FilePanelFocus;
  mode: PanelMode;

  graph: readonly GraphNode[];
  laneCount: number;
  bookmarks: Map<string, string[]>;
  currentId: string | null;
  checked: ReadonlySet<string>;

  files: FileChange[];
  fileSel: number;
  patch: string;

  error: string | null;

  overlay: PanelOverlay;
  overlayChangeId: string | null;
  overlayPath: string | null;

  stackListRef: { current: PublicInstance | null };
  fileListRef: { current: PublicInstance | null };
  diffRef: { current: PublicInstance | null };

  selectChange(index: number): void;
  selectFile(index: number): void;
  setFocus(focus: FilePanelFocus): void;
  toggleChecked(changeId: string): void;

  onKey(event: EventPayload): boolean;
  closeOverlay(): void;
  applyRevset(revset: string): void;
  applyBookmark(name: string): Promise<void>;
  forgetBookmark(name: string): Promise<void>;

  refresh(): Promise<void>;
}

export function useChangesPanel(opts: ChangesPanelOptions): ChangesPanelState {
  const { cwd, toast, enabled, onPickPath, onInstruction } = opts;
  const renderer = useGpuixRequired();
  const rowHeight = useAdwaita().control.rowHeight;

  const refs = useChangesPanelRefs(renderer);
  const data = useChangeStackData({ cwd, enabled });
  const selection = useChangesSelection(data.files.length);
  const writes = useChangeWrites({ toast, data });
  const overlay = useChangesOverlay({
    selectedChange: writes.selectedChange,
    runMutation: writes.runMutation,
  });
  const move = useChangesMove({
    toast,
    rows: () => data.rows,
    sel: () => data.live().sel,
    setSel: data.setSel,
    runMutation: writes.runMutation,
  });
  const { graph, laneCount } = useChangeGraph(
    move.mode === "move" ? move.moveRows : data.rows,
  );
  const nav = useChangesNav({
    data,
    move,
    stackListRef: refs.stackListRef,
    renderer,
    rowHeight,
  });
  const actions = useChangesActions({
    toast,
    data,
    writes,
    overlay,
    checked: selection.checked,
    enterMoveMode: move.enter,
    toggleChecked: selection.toggleChecked,
    clearChecked: selection.clearChecked,
    onPickPath,
    onInstruction,
  });

  /** A revset key opens the picker and needs no change under the cursor. */
  const runStackAction = useCallback(
    (id: string): boolean => {
      if (id === "revset") {
        overlay.openRevset();
        return true;
      }
      return actions.stackAction(id);
    },
    [actions, overlay],
  );

  const applyRevset = useCallback(
    (next: string): void => {
      overlay.close();
      data.applyRevset(next);
    },
    [data, overlay],
  );

  const onKey = useCallback(
    (event: EventPayload): boolean => {
      const key = keyOf(event);
      const mods = modsOf(event);

      if (overlay.overlay !== "none") {
        if (key === "escape") overlay.close();
        return true;
      }

      if (move.mode === "move")
        return runMoveKey(key, mods, {
          nav: nav.goStack,
          apply: () => void move.apply(),
          cancel: move.cancel,
        });

      const actionsOpen = isBareKey(mods);
      const id = matchPanelKey(selection.focus, key, mods);
      if (selection.focus === "stack")
        return runStackKey(id, {
          rowCount: data.rows.length,
          actionsOpen,
          canFocusFiles: data.live().files.length > 0,
          nav: nav.goStack,
          focusFiles: () => selection.setFocus("files"),
          first: () => data.selectChange(0),
          last: () => data.selectChange(data.rows.length - 1),
          run: runStackAction,
        });

      return runFileKey(id, {
        actionsOpen,
        nav: nav.goFile,
        focusStack: () => selection.setFocus("stack"),
        scroll: (down) => refs.scrollDiff(down),
        pick: () => actions.filesAction("pick"),
        run: actions.filesAction,
      });
    },
    [actions, data, move, nav, overlay, refs, runStackAction, selection],
  );

  return {
    revsets: data.revsets,
    currentRevset: data.currentRevset,
    rows: data.rows,
    sel: data.sel,
    focus: selection.focus,
    mode: move.mode,
    graph,
    laneCount,
    bookmarks: data.bookmarks,
    currentId: data.currentId,
    checked: selection.checked,
    files: data.files,
    fileSel: data.fileSel,
    patch: data.patch,
    error: data.error,
    overlay: overlay.overlay,
    overlayChangeId: overlay.changeId,
    overlayPath: overlay.path,
    stackListRef: refs.stackListRef,
    fileListRef: refs.fileListRef,
    diffRef: refs.diffRef,
    selectChange: data.selectChange,
    selectFile: data.selectFile,
    setFocus: selection.setFocus,
    toggleChecked: selection.toggleChecked,
    onKey,
    closeOverlay: overlay.close,
    applyRevset,
    applyBookmark: overlay.applyBookmark,
    forgetBookmark: overlay.forgetBookmark,
    refresh: data.refresh,
  };
}
