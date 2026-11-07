/**
 * Moving the cursor.
 *
 * A page key moves by what is actually on screen, so it asks the list how tall
 * it is; a selection that did not move is not a re-read of the change's files.
 */
import { useCallback } from "react";
import type { PublicInstance } from "@gpuix/react";
import type { NativeRenderer } from "@gpuix/native/host";
import { navIndex } from "../lib/nav";
import type { NavDirection } from "../types";
import type { ChangesMove } from "./useChangesMove";
import type { StackData } from "./useChangeStackData";

export interface ChangesNavOptions {
  data: StackData;
  move: ChangesMove;

  stackListRef: { current: PublicInstance | null };
  renderer: NativeRenderer;
  rowHeight: number;
}

export interface ChangesNav {
  goStack(direction: NavDirection): void;
  goFile(direction: NavDirection): void;
}

export function useChangesNav(options: ChangesNavOptions): ChangesNav {
  const { data, move, stackListRef, renderer, rowHeight } = options;

  const pageRows = useCallback((): number => {
    const id = stackListRef.current?.id;
    if (id === undefined) return 10;
    const viewH = renderer.getListScrollTop?.(id)?.[2] ?? 0;
    if (viewH <= 0) return 10;
    const count = Math.floor(viewH / rowHeight);
    return count > 1 ? count - 1 : 10;
  }, [stackListRef, renderer, rowHeight]);

  const goStack = useCallback(
    (direction: NavDirection): void => {
      const source = move.shown();
      if (source.length === 0) return;
      const from = data.live().sel;
      const next = navIndex(from, source.length, direction, pageRows());
      if (move.mode === "move") {
        move.swap(from, next);
        data.setSel(next);
        return;
      }
      if (next === from) return;
      data.selectChange(next);
    },
    [data, move, pageRows],
  );

  const goFile = useCallback(
    (direction: NavDirection): void => {
      const live = data.live();
      const count = live.files.length;
      if (count === 0) return;
      const from = live.fileSel;
      const next = navIndex(from, count, direction, 10);
      if (next === from) return;
      data.selectFile(next);
    },
    [data],
  );

  return { goStack, goFile };
}
