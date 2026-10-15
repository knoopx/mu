import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createPollWatcher,
  fileSample,
  jjOpHeadPath,
  makeDiffScroller,
  useAdwaita,
  type ToastFn,
} from "adwaita-gpuix";
import { useGpuixRequired, type PublicInstance } from "@gpuix/react";
import type { EventPayload } from "@gpuix/native";
import {
  generateGraphData,
  graphLaneCount,
  type GraphNode,
} from "adwaita-gpuix";
import {
  bookmarkNamesFor,
  bookmarksByChange,
  describeChange,
  failMessage,
  findWorkspaceRoot,
  getCurrentChangeId,
  getRawDiff,
  listBookmarks,
  loadChangedFiles,
  loadChanges,
  openFileInEditor,
  rebaseChange,
  restoreFile,
  splitFileChange,
} from "../lib/repo";
import { REVSETS } from "../constants";
import { navIndex } from "../lib/nav";
import type {
  Change,
  FileChange,
  FilePanelFocus,
  PanelMode,
  RevsetDef,
} from "../types";
import {
  isBareKey,
  matchPanelKey,
  runFileKey,
  runMoveKey,
  runStackKey,
  STACK_MUTATIONS,
} from "../lib/keymap";
import { keyOf, modsOf } from "../../core/lib/ui/keyEvents";

export type PanelOverlay = "none" | "revset" | "bookmark" | "describe";

export interface ChangesPanelOptions {
  cwd: string;
  toast: ToastFn;

  enabled: boolean;

  onPickPath: (path: string) => void;
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
  applyDescribe(message: string): Promise<void>;
  applyBookmark(name: string): Promise<void>;
  forgetBookmark(name: string): Promise<void>;

  refresh(): Promise<void>;
}

export function useChangesPanel(opts: ChangesPanelOptions): ChangesPanelState {
  const { cwd, toast, enabled, onPickPath } = opts;
  const renderer = useGpuixRequired();
  const rowHeight = useAdwaita().control.rowHeight;

  const [revsetIndex, setRevsetIndex] = useState(0);
  const [allChanges, setAllChanges] = useState<Change[]>([]);
  const [sel, setSel] = useState(0);
  const [bookmarks, setBookmarks] = useState<Map<string, string[]>>(new Map());
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const [files, setFiles] = useState<FileChange[]>([]);
  const [fileSel, setFileSel] = useState(0);
  const [patch, setPatch] = useState("");
  const [focus, setFocus] = useState<FilePanelFocus>("stack");
  const [mode, setMode] = useState<PanelMode>("normal");
  const [moveRows, setMoveRows] = useState<Change[]>([]);
  const [moveOrigin, setMoveOrigin] = useState(0);

  const [error, setError] = useState<string | null>(null);

  const [overlay, setOverlay] = useState<PanelOverlay>("none");
  const [overlayChangeId, setOverlayChangeId] = useState<string | null>(null);
  const [overlayPath, setOverlayPath] = useState<string | null>(null);

  const stackListRef = useRef<PublicInstance | null>(null);
  const fileListRef = useRef<PublicInstance | null>(null);
  const diffRef = useRef<PublicInstance | null>(null);
  const scrollDiff = makeDiffScroller(diffRef, renderer);

  const revset = REVSETS[Math.min(revsetIndex, REVSETS.length - 1)];

  const rows = allChanges;
  const displayed = mode === "move" ? moveRows : rows;
  const graph = useMemo(
    () =>
      generateGraphData(
        displayed.map((c) => ({ id: c.commit_id, parents: c.parents })),
      ),
    [displayed],
  );
  const laneCount = useMemo(() => graphLaneCount(graph), [graph]);

  const stateRef = useRef({
    allChanges,
    rows,
    sel,
    fileSel,
    files,
    displayed,
    moveRows,
  });
  stateRef.current = {
    allChanges,
    rows,
    sel,
    fileSel,
    files,
    displayed,
    moveRows,
  };

  const resetSelectionRef = useRef(false);

  const closeOverlay = useCallback((): void => {
    setOverlay("none");
  }, []);

  const loadFilesFor = useCallback(
    async (
      index: number,
      source: Change[],
      fileIndex?: number,
    ): Promise<void> => {
      const change = source[index];
      if (change === undefined) {
        setFiles([]);
        setFileSel(0);
        setPatch("");
        return;
      }
      const fs = await loadChangedFiles(change.change_id);
      setFiles(fs);
      const idx =
        fileIndex ??
        Math.max(0, Math.min(stateRef.current.fileSel, fs.length - 1));
      setFileSel(idx);
      setPatch(await getRawDiff(change.change_id, fs[idx]?.path));
    },
    [],
  );

  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled) return;
    try {
      const [chs, bms, cur] = await Promise.all([
        loadChanges(revset.revset),
        listBookmarks(),
        getCurrentChangeId(),
      ]);
      setAllChanges(chs);
      setBookmarks(bookmarksByChange(bms));
      setCurrentId(cur);
      setError(null);
      if (resetSelectionRef.current) {
        resetSelectionRef.current = false;
        setSel(0);
        setFileSel(0);
        await loadFilesFor(0, chs, 0);
        return;
      }
      const keep = stateRef.current.allChanges[stateRef.current.sel]?.change_id;
      const nextSel =
        keep === undefined
          ? stateRef.current.sel
          : Math.max(
              0,
              chs.findIndex((c) => c.change_id === keep),
            );
      setSel(Math.min(nextSel, Math.max(chs.length - 1, 0)));
      await loadFilesFor(Math.min(nextSel, Math.max(chs.length - 1, 0)), chs);
    } catch (e) {
      setError(failMessage(e));
    }
  }, [enabled, revset.revset, loadFilesFor]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (files.length === 0) setFocus("stack");
  }, [files.length]);

  useEffect(() => {
    if (!enabled) return;
    const target = jjOpHeadPath(findWorkspaceRoot(cwd));
    if (target === null) return;
    const watcher = createPollWatcher(
      () => fileSample(target),
      () => {
        void refreshRef.current();
      },
    );
    return () => watcher.stop();
  }, [cwd, enabled]);

  const selectChange = useCallback(
    (index: number): void => {
      setSel(index);
      void loadFilesFor(index, stateRef.current.rows);
    },
    [loadFilesFor],
  );

  const selectFile = useCallback((index: number): void => {
    const change = stateRef.current.rows[stateRef.current.sel];
    setFileSel(index);
    if (change === undefined) return;
    void getRawDiff(change.change_id, stateRef.current.files[index]?.path).then(
      setPatch,
    );
  }, []);

  const pageRows = useCallback((): number => {
    const id = stackListRef.current?.id;
    if (id === undefined) return 10;
    const viewH = renderer.getListScrollTop?.(id)?.[2] ?? 0;
    if (viewH <= 0) return 10;
    const count = Math.floor(viewH / rowHeight);
    return count > 1 ? count - 1 : 10;
  }, [renderer, rowHeight]);

  const runMutation = useCallback(
    async (fn: () => Promise<string>): Promise<void> => {
      try {
        const msg = await fn();
        toast(msg, { type: "success" });
        setError(null);
        await refresh();
      } catch (e) {
        setError(failMessage(e));
        toast(failMessage(e), { type: "error" });
      }
    },
    [refresh, toast],
  );

  const selectedChange = (): Change | undefined =>
    stateRef.current.rows[stateRef.current.sel];

  const describeTargets = useCallback((): string[] => {
    const ids = Array.from(checked);
    if (ids.length > 0) return ids;
    const change = selectedChange();
    return change === undefined ? [] : [change.change_id];
  }, [checked]);

  const toggleChecked = useCallback((changeId: string): void => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(changeId)) next.delete(changeId);
      else next.add(changeId);
      return next;
    });
  }, []);

  const goStack = useCallback(
    (direction: "up" | "down" | "pageUp" | "pageDown"): void => {
      const source = stateRef.current.displayed;
      if (source.length === 0) return;
      const next = navIndex(
        stateRef.current.sel,
        source.length,
        direction,
        pageRows(),
      );
      if (mode === "move") {
        setMoveRows((prev) => {
          const arr = [...prev];
          const target = next;
          if (target < 0 || target >= arr.length) return prev;
          const from = stateRef.current.sel;
          [arr[from], arr[target]] = [arr[target], arr[from]];
          return arr;
        });
        setSel(next);
        return;
      }
      if (next === stateRef.current.sel) return;
      selectChange(next);
    },
    [mode, pageRows, selectChange],
  );

  const goFile = useCallback(
    (direction: "up" | "down" | "pageUp" | "pageDown"): void => {
      const count = stateRef.current.files.length;
      if (count === 0) return;
      const next = navIndex(stateRef.current.fileSel, count, direction, 10);
      if (next === stateRef.current.fileSel) return;
      selectFile(next);
    },
    [selectFile],
  );

  const enterMoveMode = useCallback((): void => {
    setMode("move");
    setMoveRows(stateRef.current.rows);
    setMoveOrigin(stateRef.current.sel);
    toast("Move mode — up/down to place, Enter to rebase, Esc to cancel", {
      type: "info",
    });
  }, [toast]);

  const cancelMove = useCallback((): void => {
    setMode("normal");
    setMoveRows([]);
    setSel(moveOrigin);
  }, [moveOrigin]);

  const applyMove = useCallback(async (): Promise<void> => {
    const from = moveOrigin;
    const to = stateRef.current.sel;
    if (from === to) {
      cancelMove();
      return;
    }
    const after = to > from;
    const source = stateRef.current.moveRows;
    const target = source[after ? to - 1 : to + 1];
    const moved = source[to];
    if (target === undefined || moved === undefined) {
      toast("Cannot move to the top or bottom of the stack", {
        type: "warning",
      });
      return;
    }
    await runMutation(() =>
      rebaseChange(moved.change_id, target.change_id, after),
    );
    cancelMove();
  }, [cancelMove, moveOrigin, runMutation, toast]);

  const applyRevset = useCallback(
    (next: string): void => {
      const index = REVSETS.findIndex((r) => r.revset === next);
      closeOverlay();
      if (index === -1) return;
      resetSelectionRef.current = true;
      setRevsetIndex(index);
    },
    [closeOverlay],
  );

  const applyDescribe = useCallback(
    async (message: string): Promise<void> => {
      const ids = describeTargets();
      closeOverlay();
      setChecked(new Set());
      if (ids.length === 0 || message.trim().length === 0) return;
      await runMutation(async () => {
        for (const id of ids) await describeChange(id, message.trim());
        return `Described ${ids.length} change${ids.length === 1 ? "" : "s"}`;
      });
    },
    [closeOverlay, describeTargets, runMutation],
  );

  const applyBookmark = useCallback(
    async (name: string): Promise<void> => {
      const change = selectedChange();
      closeOverlay();
      if (change === undefined || name.trim().length === 0) return;
      const { setBookmarkToChange } = await import("../lib/repo");
      await runMutation(() =>
        setBookmarkToChange(name.trim(), change.change_id),
      );
    },
    [closeOverlay, runMutation],
  );

  const forget = useCallback(
    async (name: string): Promise<void> => {
      closeOverlay();
      const { forgetBookmark } = await import("../lib/repo");
      await runMutation(() => forgetBookmark(name));
    },
    [closeOverlay, runMutation],
  );

  const pushBookmarks = useCallback(async (): Promise<void> => {
    const change = selectedChange();
    if (change === undefined) return;
    const bms = await listBookmarks();
    const names = bookmarkNamesFor(bms, change.change_id);
    if (names.length === 0) {
      toast(`No bookmarks on ${change.change_id.slice(0, 8)}`, {
        type: "warning",
      });
      return;
    }
    const { pushBookmarks: push } = await import("../lib/repo");
    await runMutation(async () => await push(names));
  }, [runMutation, toast]);

  const stackAction = useCallback(
    (id: string): boolean => {
      if (id === "revset") {
        setOverlay("revset");
        return true;
      }
      const change = selectedChange();
      if (change === undefined) return false;
      const mutate = STACK_MUTATIONS[id];
      if (mutate !== undefined) {
        void runMutation(() => mutate(change.change_id));
        return true;
      }
      if (id === "bookmark") {
        setOverlay("bookmark");
        setOverlayChangeId(change.change_id);
        return true;
      }
      if (id === "describe") {
        setOverlay("describe");
        return true;
      }
      if (id === "select") {
        toggleChecked(change.change_id);
        return true;
      }
      if (id === "push") {
        void pushBookmarks();
        return true;
      }
      if (id === "move") {
        enterMoveMode();
        return true;
      }
      return false;
    },
    [enterMoveMode, pushBookmarks, runMutation, toggleChecked],
  );

  const filesAction = useCallback(
    (id: string): boolean => {
      const change = selectedChange();
      const file = stateRef.current.files[stateRef.current.fileSel];
      if (id === "pick") {
        if (file !== undefined) onPickPath(file.path);
        return true;
      }
      if (change === undefined || file === undefined) return false;
      switch (id) {
        case "open":
          openFileInEditor(file.path);
          toast(`Opening ${file.path} in the editor`, { type: "info" });
          return true;
        case "split-file":
          void runMutation(() => splitFileChange(change.change_id, file.path));
          return true;
        case "discard":
          void runMutation(() => restoreFile(change.change_id, file.path));
          return true;
        default:
          return false;
      }
    },
    [onPickPath, runMutation, toast],
  );

  const onKey = useCallback(
    (event: EventPayload): boolean => {
      const key = keyOf(event);
      const mods = modsOf(event);

      if (overlay !== "none") {
        if (key === "escape") closeOverlay();
        return true;
      }

      if (mode === "move")
        return runMoveKey(key, mods, {
          nav: goStack,
          apply: () => void applyMove(),
          cancel: cancelMove,
        });

      const actionsOpen = isBareKey(mods);
      const id = matchPanelKey(focus, key, mods);
      if (focus === "stack")
        return runStackKey(id, {
          rowCount: rows.length,
          actionsOpen,
          canFocusFiles: stateRef.current.files.length > 0,
          nav: goStack,
          focusFiles: () => setFocus("files"),
          first: () => selectChange(0),
          last: () => selectChange(rows.length - 1),
          run: stackAction,
        });

      return runFileKey(id, {
        actionsOpen,
        nav: goFile,
        focusStack: () => setFocus("stack"),
        scroll: (down) => scrollDiff(down),
        pick: () => filesAction("pick"),
        run: filesAction,
      });
    },
    [
      applyMove,
      cancelMove,
      closeOverlay,
      filesAction,
      focus,
      goFile,
      goStack,
      mode,
      overlay,
      rows.length,
      scrollDiff,
      selectChange,
      stackAction,
    ],
  );

  return {
    revsets: REVSETS,
    currentRevset: revset.revset,
    rows,
    sel,
    focus,
    mode,
    graph,
    laneCount,
    bookmarks,
    currentId,
    checked,
    files,
    fileSel,
    patch,
    error,
    overlay,
    overlayChangeId,
    overlayPath,
    stackListRef,
    fileListRef,
    diffRef,
    selectChange,
    selectFile,
    setFocus,
    toggleChecked,
    onKey,
    closeOverlay,
    applyRevset,
    applyDescribe,
    applyBookmark,
    forgetBookmark: forget,
    refresh,
  };
}
