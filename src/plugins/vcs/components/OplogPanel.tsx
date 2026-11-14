/**
 * The operation log panel: jj's own history of the repo, and the diff of the
 * operation the cursor stands on.
 *
 * The layout is the changes panel's — a list on the left, the files of the
 * picked row and one file's patch on the right — because the two panels answer
 * the same question at different depths: what changed here, and when did the
 * repo change at all.
 */
import type { JSX } from "react";
import { ComposerOptionRow } from "../../core/components/composer/rows";
import { operationAge, rowLabel } from "../lib/rowText";
import { usePanelChrome } from "../../core/lib/composer/chrome";
import { FilePreviewPane } from "./FilePreviewPane";
import { PanelStackPane } from "./PanelStackPane";
import type { OplogPanelState } from "../hooks/useOplogPanel";

export function OplogPanel({ panel }: { panel: OplogPanelState }): JSX.Element {
  const s = usePanelChrome();

  return (
    <div style={s.splitRow}>
      <PanelStackPane
        rows={panel.rows}
        sel={panel.sel}
        listRef={panel.stackListRef}
        error={panel.error}
        emptyText="No operations"
        rowKey={(entry) => entry.op}
        rowOf={(entry, i) => (
          <ComposerOptionRow
            label={rowLabel(entry.description)}
            description={operationAge(entry.time)}
            tabular
            // The newest operation is where the repo stands: it is the one
            // restoring to would be a no-op for.
            picked={i === 0}
            active={i === panel.sel}
            focused={panel.focus === "stack"}
            onClick={() => panel.selectOp(i)}
            onHover={() => panel.selectOp(i)}
          />
        )}
      />
      <div style={s.paneRule} />
      {/* An operation's two sides are whole-repo snapshots, not a change and its
          parent, so an image file has no before-and-after pair to paint here. */}
      <FilePreviewPane
        state={panel}
        image={null}
        emptyText="No files in this operation"
      />
    </div>
  );
}
