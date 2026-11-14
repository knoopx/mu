/**
 * The changes panel's own reading of the repo.
 *
 * The panel shows the changes of a revset; a refresh re-reads them and keeps
 * the reader on the change they were on, and a watch on jj's op log head runs
 * that refresh whenever the repo moves underneath the panel. The files and the
 * patch under a change are read elsewhere — see useChangeFiles.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { failMessage } from "../lib/repo";
import { useRepoSource } from "../components/RepoSource";
import { REVSETS } from "../constants";
import { bookmarksByChange, type Change, type FileChange } from "adwaita-gpuix";
import { RevsetDef } from "../types";
import { type ChangeImage, useChangeFiles } from "./useChangeFiles";
import { useRepoWatch } from "./useRepoWatch";

/** The panel's latest answers, read at the moment a key is handled. */
export interface StackSnapshot {
  allChanges: Change[];
  sel: number;
  fileSel: number;
  files: FileChange[];
}

export interface StackDataOptions {
  cwd: string;

  enabled: boolean;
}

export interface StackData {
  revsets: readonly RevsetDef[];
  currentRevset: string;
  rows: Change[];
  sel: number;
  files: FileChange[];
  fileSel: number;
  patch: string;
  image: ChangeImage | null;
  error: string | null;
  bookmarks: Map<string, string[]>;
  currentId: string | null;

  live(): StackSnapshot;

  selectChange(index: number): void;
  selectFile(index: number): void;
  setError(message: string | null): void;
  applyRevset(revset: string): void;
  refresh(): Promise<void>;
}

/**
 * Keep the panel on the change it was on. A refresh reorders the stack, so the
 * selection follows the change id rather than the row number, and a selection
 * that has left the list lands at its end.
 */
function keepSelection(before: StackSnapshot, next: readonly Change[]): number {
  const keep = before.allChanges[before.sel]?.change_id;
  const found =
    keep === undefined
      ? before.sel
      : Math.max(
          0,
          next.findIndex((change) => change.change_id === keep),
        );
  return Math.min(found, Math.max(next.length - 1, 0));
}

export function useChangeStackData(options: StackDataOptions): StackData {
  const { cwd, enabled } = options;

  const [revsetIndex, setRevsetIndex] = useState(0);
  const [allChanges, setAllChanges] = useState<Change[]>([]);
  const [sel, setSel] = useState(0);
  const [bookmarks, setBookmarks] = useState<Map<string, string[]>>(new Map());
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const revset = REVSETS[Math.min(revsetIndex, REVSETS.length - 1)];

  const {
    files,
    fileSel,
    patch,
    image,
    show: showFiles,
    select: selectFileOf,
    setFileSel,
  } = useChangeFiles();

  const source = useRepoSource();

  const liveRef = useRef<StackSnapshot>({ allChanges, sel, fileSel, files });
  liveRef.current = { allChanges, sel, fileSel, files };

  const resetSelectionRef = useRef(false);

  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled) return;
    try {
      const [chs, bms, cur] = await Promise.all([
        source.changes(revset.revset),
        source.bookmarks(),
        source.currentChangeId(),
      ]);
      setAllChanges(chs);
      setBookmarks(bookmarksByChange(bms));
      setCurrentId(cur);
      setError(null);
      if (resetSelectionRef.current) {
        resetSelectionRef.current = false;
        setSel(0);
        setFileSel(0);
        await showFiles(chs[0], 0);
        return;
      }
      const next = keepSelection(liveRef.current, chs);
      setSel(next);
      await showFiles(chs[next]);
    } catch (e) {
      setError(failMessage(e));
    }
  }, [enabled, revset.revset, showFiles, setFileSel, source]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useRepoWatch(cwd, enabled, () => {
    void refresh();
  });

  const selectChange = useCallback(
    (index: number): void => {
      setSel(index);
      void showFiles(liveRef.current.allChanges[index]);
    },
    [showFiles],
  );

  const selectFile = useCallback(
    (index: number): void => {
      const live = liveRef.current;
      selectFileOf(live.allChanges[live.sel], index);
    },
    [selectFileOf],
  );

  const applyRevset = useCallback((next: string): void => {
    const index = REVSETS.findIndex((r) => r.revset === next);
    if (index === -1) return;
    resetSelectionRef.current = true;
    setRevsetIndex(index);
  }, []);

  return {
    revsets: REVSETS,
    currentRevset: revset.revset,
    rows: allChanges,
    sel,
    files,
    fileSel,
    patch,
    image,
    error,
    bookmarks,
    currentId,
    live: () => liveRef.current,
    selectChange,
    selectFile,
    setError,
    applyRevset,
    refresh,
  };
}
