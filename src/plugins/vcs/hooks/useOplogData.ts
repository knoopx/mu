/**
 * The operation log, and the one operation the panel stands on.
 *
 * jj's op log is newest-first and every operation is immutable, so two things
 * fall out. A refresh keeps the cursor on the *operation* it was on, because a
 * row number would walk it backwards through history every time the repo moves.
 * And an operation's patch, once read, is never wrong, so it is kept and not
 * read again — the whole history is too big to hold, so the panel drops the lot
 * rather than tracking an eviction order for a preview.
 *
 * The files of an operation are not a separate read: one `jj op diff` answers
 * the operation as one patch, and `opPatchFiles` cuts it into rows.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRepoSource } from "../components/RepoSource";
import { opPatchFiles, type OpPatchFile } from "../lib/opPatch";
import { OPLOG_PANEL_ROWS, OP_PATCH_CACHE } from "../constants";
import { useRepoWatch } from "./useRepoWatch";
import type { OplogRow } from "../types";

/** The panel's latest answers, read at the moment a key is handled. */
export interface OplogSnapshot {
  rows: OplogRow[];
  sel: number;
  fileSel: number;
  files: OpPatchFile[];
}

export interface OplogDataOptions {
  cwd: string;

  enabled: boolean;
}

export interface OplogData {
  rows: OplogRow[];
  sel: number;
  files: OpPatchFile[];
  fileSel: number;

  /** the block of the file the cursor is on, header included */
  patch: string;

  error: string | null;

  live(): OplogSnapshot;

  selectOp(index: number): void;
  selectFile(index: number): void;
  setError(message: string | null): void;
  refresh(): Promise<void>;
}

/**
 * Keep the panel on the operation it was on. A refresh prepends, so the cursor
 * follows the operation id rather than the row number, and an operation that
 * has left the list — undone, or pushed past the row cap — puts the cursor on
 * the newest one, which is where the repo stands.
 */
function keepSelection(
  before: OplogSnapshot,
  next: readonly OplogRow[],
): number {
  const keep = before.rows[before.sel]?.op;
  const found =
    keep === undefined ? before.sel : next.findIndex((row) => row.op === keep);
  return Math.min(Math.max(found, 0), Math.max(next.length - 1, 0));
}

export function useOplogData(options: OplogDataOptions): OplogData {
  const { cwd, enabled } = options;

  const [rows, setRows] = useState<OplogRow[]>([]);
  const [sel, setSel] = useState(0);
  const [fileSel, setFileSel] = useState(0);
  const [opPatch, setOpPatch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const files = useMemo(() => opPatchFiles(opPatch), [opPatch]);
  const at = Math.max(0, Math.min(fileSel, files.length - 1));
  const patch = files[at]?.patch ?? "";

  const liveRef = useRef<OplogSnapshot>({
    rows,
    sel,
    fileSel: at,
    files,
  });
  liveRef.current = { rows, sel, fileSel: at, files };

  /** A slow read must not land after a newer selection has. */
  const seqRef = useRef(0);
  const cacheRef = useRef(new Map<string, string>());

  const source = useRepoSource();

  const readPatch = useCallback(
    async (op: string | undefined): Promise<void> => {
      const seq = ++seqRef.current;
      if (op === undefined) {
        setOpPatch("");
        return;
      }
      const held = cacheRef.current.get(op);
      if (held !== undefined) {
        setOpPatch(held);
        return;
      }
      const out = await source.opPatch(op);
      if (seq !== seqRef.current) return;
      if (out.status === "failed") {
        setError(out.error);
        return;
      }
      if (cacheRef.current.size >= OP_PATCH_CACHE) cacheRef.current.clear();
      cacheRef.current.set(op, out.patch);
      setOpPatch(out.patch);
    },
    [source],
  );

  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled) return;
    const out = await source.oplog(OPLOG_PANEL_ROWS, 0, false, true);
    if (out.status === "failed") {
      setError(out.error);
      return;
    }
    setError(null);
    const next = keepSelection(liveRef.current, out.rows);
    setRows(out.rows);
    setSel(next);
    await readPatch(out.rows[next]?.op);
  }, [enabled, readPatch, source]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useRepoWatch(cwd, enabled, () => {
    void refresh();
  });

  const selectOp = useCallback(
    (index: number): void => {
      setSel(index);
      void readPatch(liveRef.current.rows[index]?.op);
    },
    [readPatch],
  );

  const selectFile = useCallback((index: number): void => {
    setFileSel(index);
  }, []);

  return {
    rows,
    sel,
    files,
    fileSel: at,
    patch,
    error,
    live: () => liveRef.current,
    selectOp,
    selectFile,
    setError,
    refresh,
  };
}
