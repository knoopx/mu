import type { JSX } from "react";
import { type Change } from "adwaita-gpuix";
import { ComposerOptionRow } from "../../core/components/composer/rows";
import { relativeAge } from "../../core/lib/utils/time";
import { hasNoDescription, PANEL_LIST_CAP } from "../constants";
import { rowLabel } from "../lib/rowText";
import { usePanelChrome } from "../../core/lib/composer/chrome";
import { FilePreviewPane } from "./FilePreviewPane";
import { PaneEmpty } from "./PaneEmpty";
import { PanelList } from "./PanelList";
import type { ChangesPanelState } from "../hooks/useChangesPanel";

/**
 * A change row goes quiet when there is nothing to read on it, or when it is
 * there to be looked at rather than acted on — an immutable change takes no
 * describe, split or drop.
 */
function changeRowIsDimmed(change: Change): boolean {
  return change.immutable || hasNoDescription(change.description);
}

export function ChangesPanel({
  panel,
}: {
  panel: ChangesPanelState;
}): JSX.Element {
  const s = usePanelChrome();
  const stack = panel.rows.slice(0, PANEL_LIST_CAP);

  return (
    <div style={s.splitRow}>
      <div style={s.listPane()}>
        {panel.error !== null ? (
          <PaneEmpty text={panel.error} style={s.emptyPane} />
        ) : stack.length === 0 ? (
          <PaneEmpty text="No changes in this revset" style={s.emptyPane} />
        ) : (
          <PanelList
            rows={stack}
            sel={panel.sel}
            listRef={panel.stackListRef}
            rowKey={(entry) => entry.change_id}
            rowOf={(entry, i) => (
              <ComposerOptionRow
                label={rowLabel(entry.description)}
                description={relativeAge(entry.timestamp)}
                tabular
                picked={entry.change_id === panel.currentId}
                dimmed={changeRowIsDimmed(entry)}
                active={i === panel.sel}
                focused={panel.focus === "stack"}
                onClick={() => panel.selectChange(i)}
                onHover={() => panel.selectChange(i)}
              />
            )}
          />
        )}
      </div>
      <div style={s.paneRule} />
      <FilePreviewPane
        files={panel.files}
        fileSel={panel.fileSel}
        focused={panel.focus === "files"}
        fileListRef={panel.fileListRef}
        diffRef={panel.diffRef}
        onSelect={panel.selectFile}
        patch={panel.patch}
        image={panel.image}
        emptyText="No files in this change"
      />
    </div>
  );
}
