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
import { PANEL_LIST_CAP } from "../constants";
import { operationAge, rowLabel } from "../lib/rowText";
import { usePanelChrome } from "../../core/lib/composer/chrome";
import { FilePreviewPane } from "./FilePreviewPane";
import { PaneEmpty } from "./PaneEmpty";
import { PanelList } from "./PanelList";
import type { OplogPanelState } from "../hooks/useOplogPanel";

export function OplogPanel({ panel }: { panel: OplogPanelState }): JSX.Element {
  const s = usePanelChrome();
  const ops = panel.rows.slice(0, PANEL_LIST_CAP);

  return (
    <div style={s.splitRow}>
      <div style={s.listPane()}>
        {panel.error !== null ? (
          <PaneEmpty text={panel.error} style={s.emptyPane} />
        ) : ops.length === 0 ? (
          <PaneEmpty text="No operations" style={s.emptyPane} />
        ) : (
          <PanelList
            rows={ops}
            sel={panel.sel}
            listRef={panel.stackListRef}
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
        )}
      </div>
      <div style={s.paneRule} />
      {/* An operation's two sides are whole-repo snapshots, not a change and its
          parent, so an image file has no before-and-after pair to paint here. */}
      <FilePreviewPane
        files={panel.files}
        fileSel={panel.fileSel}
        focused={panel.focus === "files"}
        fileListRef={panel.fileListRef}
        diffRef={panel.diffRef}
        onSelect={panel.selectFile}
        patch={panel.patch}
        image={null}
        emptyText="No files in this operation"
      />
    </div>
  );
}
