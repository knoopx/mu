import type { JSX } from "react";
import { type Change } from "adwaita-gpuix";
import { ComposerOptionRow } from "../../core/components/composer/rows";
import { relativeAge } from "../../core/lib/utils/time";
import { hasNoDescription } from "../constants";
import { rowLabel } from "../lib/rowText";
import { usePanelChrome } from "../../core/lib/composer/chrome";
import { FilePreviewPane } from "./FilePreviewPane";
import { PanelStackPane } from "./PanelStackPane";
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

  return (
    <div style={s.splitRow}>
      <PanelStackPane
        rows={panel.rows}
        sel={panel.sel}
        listRef={panel.stackListRef}
        error={panel.error}
        emptyText="No changes in this revset"
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
      <div style={s.paneRule} />
      <FilePreviewPane
        state={panel}
        image={panel.image}
        emptyText="No files in this change"
      />
    </div>
  );
}
