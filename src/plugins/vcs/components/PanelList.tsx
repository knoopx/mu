/**
 * One list of a vcs panel.
 *
 * The change stack and the operation log hold different rows in the same shape:
 * a virtual window the renderer scrolls, a row slot per row, and a cursor the
 * list keeps in view. The panel says which row is selected and what one row of
 * its rows looks like; the window, the following and the slot are here.
 */
import { useEffect, type JSX, type ReactNode } from "react";
import { useGpuixRequired, type PublicInstance } from "@gpuix/react";
import {
  useListFollow,
  useListWindow,
  VirtualListPanel,
} from "adwaita-gpuix";
import { ROW_HEIGHT } from "../../core/lib/ui/tokens";
import { usePanelChrome } from "../../core/lib/composer/chrome";

export interface PanelListProps<T> {
  /** the panel's own cap is applied before this is called */
  rows: readonly T[];

  sel: number;

  listRef: { current: PublicInstance | null };

  rowKey: (row: T, index: number) => string;

  rowOf: (row: T, index: number) => ReactNode;
}

export function PanelList<T>({
  rows,
  sel,
  listRef,
  rowKey,
  rowOf,
}: PanelListProps<T>): JSX.Element {
  const s = usePanelChrome();
  const renderer = useGpuixRequired();
  const win = useListWindow(rows.length, ROW_HEIGHT);
  const follow = useListFollow(listRef, renderer, ROW_HEIGHT);

  useEffect(() => {
    follow(sel);
  }, [sel, follow]);

  return (
    <VirtualListPanel
      bare
      listRef={listRef}
      estimatedItemHeight={ROW_HEIGHT}
      itemCount={win.itemCount}
      windowStart={win.windowStart}
      overdraw={win.overdraw}
      onVisibleRange={win.onVisibleRange}
    >
      {win.slice(rows).map((entry, off) => {
        const i = win.at(off);
        return (
          <div key={rowKey(entry, i)} style={s.rowSlot}>
            {rowOf(entry, i)}
          </div>
        );
      })}
    </VirtualListPanel>
  );
}
