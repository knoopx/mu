/**
 * The left half of a vcs panel: the rows of the thing it reads, or the words
 * that say there are none.
 *
 * A change stack and an operation log fail the same way, come back empty the
 * same way, and cap what they draw to the same number of rows, so the cap, the
 * error and the empty words live here. A panel says what one of its rows looks
 * like and chooses the words it says when it has nothing to show — which is the
 * half of the panel that used to be written twice.
 */
import type { JSX } from "react";
import { usePanelChrome } from "../../core/lib/composer/chrome";
import { PanelList, type PanelListProps } from "./PanelList";
import { PaneEmpty } from "./PaneEmpty";
import { PANEL_LIST_CAP } from "../constants";

export interface PanelStackPaneProps<T> extends PanelListProps<T> {
  /** what the read answered when it failed; null when it did not */
  error: string | null;

  /** what the pane says when the read answered with nothing */
  emptyText: string;
}

export function PanelStackPane<T>({
  rows,
  sel,
  listRef,
  rowKey,
  rowOf,
  error,
  emptyText,
}: PanelStackPaneProps<T>): JSX.Element {
  const s = usePanelChrome();
  const capped = rows.slice(0, PANEL_LIST_CAP);

  return (
    <div style={s.listPane()}>
      {error !== null ? (
        <PaneEmpty text={error} style={s.emptyPane} />
      ) : capped.length === 0 ? (
        <PaneEmpty text={emptyText} style={s.emptyPane} />
      ) : (
        <PanelList
          rows={capped}
          sel={sel}
          listRef={listRef}
          rowKey={rowKey}
          rowOf={rowOf}
        />
      )}
    </div>
  );
}
