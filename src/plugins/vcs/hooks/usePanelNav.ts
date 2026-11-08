/**
 * Moving the cursor.
 *
 * A page key moves by what is actually on screen, so it asks the list how tall
 * it is; a selection that did not move is not a re-read of the rows under it.
 * Both halves of a two-half panel — the change stack or the operation log, and
 * the files inside the row that is picked — move the same way, so the panel
 * hands over what it holds and this decides where the cursor lands.
 */
import { useCallback } from "react";
import type { PublicInstance } from "@gpuix/react";
import type { NativeRenderer } from "@gpuix/native/host";
import { navIndex } from "../lib/nav";
import type { NavDirection } from "../types";

/** What a panel holds, read at the moment a key is handled. */
export interface PanelNavSource {
  rowCount(): number;
  rowSel(): number;
  selectRow(index: number): void;

  fileCount(): number;
  fileSel(): number;
  selectFile(index: number): void;
}

export interface PanelNavOptions {
  source: PanelNavSource;

  listRef: { current: PublicInstance | null };
  renderer: NativeRenderer;
  rowHeight: number;
}

export interface PanelNav {
  goList(direction: NavDirection): void;
  goFile(direction: NavDirection): void;
}

const FALLBACK_ROWS = 10;

export function usePanelNav(options: PanelNavOptions): PanelNav {
  const { source, listRef, renderer, rowHeight } = options;

  const pageRows = useCallback((): number => {
    const id = listRef.current?.id;
    if (id === undefined) return FALLBACK_ROWS;
    const viewH = renderer.getListScrollTop?.(id)?.[2] ?? 0;
    if (viewH <= 0) return FALLBACK_ROWS;
    const count = Math.floor(viewH / rowHeight);
    return count > 1 ? count - 1 : FALLBACK_ROWS;
  }, [listRef, renderer, rowHeight]);

  const goList = useCallback(
    (direction: NavDirection): void => {
      const total = source.rowCount();
      if (total === 0) return;
      const from = source.rowSel();
      const next = navIndex(from, total, direction, pageRows());
      if (next === from) return;
      source.selectRow(next);
    },
    [source, pageRows],
  );

  const goFile = useCallback(
    (direction: NavDirection): void => {
      const total = source.fileCount();
      if (total === 0) return;
      const from = source.fileSel();
      const next = navIndex(from, total, direction, FALLBACK_ROWS);
      if (next === from) return;
      source.selectFile(next);
    },
    [source],
  );

  return { goList, goFile };
}
