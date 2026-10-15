import { type JSX } from "react";
import { BookmarkDialog, DescribeDialog, RevsetDialog } from "./Dialogs";
import type { ChangesPanelState } from "../hooks/useChangesPanel";

export function ChangesOverlayHost({
  panel,
}: {
  panel: ChangesPanelState;
}): JSX.Element | null {
  if (panel.overlay === "revset")
    return (
      <RevsetDialog
        current={panel.currentRevset}
        onApply={panel.applyRevset}
        onCancel={panel.closeOverlay}
      />
    );

  if (panel.overlay === "bookmark")
    return (
      <BookmarkDialog
        changeId={panel.overlayChangeId ?? ""}
        onSet={panel.applyBookmark}
        onCancel={panel.closeOverlay}
      />
    );

  if (panel.overlay === "describe")
    return (
      <DescribeDialog
        targets={
          panel.checked.size > 0
            ? Array.from(panel.checked)
            : panel.overlayChangeId !== null
              ? [panel.overlayChangeId]
              : []
        }
        onSubmit={panel.applyDescribe}
        onCancel={panel.closeOverlay}
      />
    );

  return null;
}
