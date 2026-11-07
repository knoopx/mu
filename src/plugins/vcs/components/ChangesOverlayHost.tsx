import { type JSX } from "react";
import { BookmarkDialog, RevsetDialog } from "./Dialogs";
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

  return null;
}
