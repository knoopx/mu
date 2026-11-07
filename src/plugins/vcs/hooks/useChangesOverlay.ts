/**
 * The two things the changes panel asks for without a session in the way.
 *
 * A revset to look at and a bookmark to write are both picked in an overlay
 * that sits over the panel: the list of revsets, or a name typed for the
 * selected change. Everything else the panel does is a direct key press, so
 * the overlay — what is open, for which change, and what answering it does —
 * lives here.
 */
import { useCallback, useState } from "react";
import { type Change } from "adwaita-gpuix";

export type PanelOverlay = "none" | "revset" | "bookmark";

export interface ChangesOverlayOptions {
  /** the change a bookmark is written on */
  selectedChange(): Change | undefined;

  runMutation(fn: () => Promise<string>): Promise<void>;
}

export interface ChangesOverlay {
  overlay: PanelOverlay;
  changeId: string | null;
  path: string | null;

  openRevset(): void;
  openBookmark(changeId: string): void;
  close(): void;

  applyBookmark(name: string): Promise<void>;
  forgetBookmark(name: string): Promise<void>;
}

export function useChangesOverlay(
  options: ChangesOverlayOptions,
): ChangesOverlay {
  const { selectedChange, runMutation } = options;

  const [overlay, setOverlay] = useState<PanelOverlay>("none");
  const [changeId, setChangeId] = useState<string | null>(null);

  const close = useCallback((): void => {
    setOverlay("none");
  }, []);

  const openRevset = useCallback((): void => {
    setOverlay("revset");
  }, []);

  const openBookmark = useCallback((id: string): void => {
    setOverlay("bookmark");
    setChangeId(id);
  }, []);

  const applyBookmark = useCallback(
    async (name: string): Promise<void> => {
      const change = selectedChange();
      close();
      if (change === undefined || name.trim().length === 0) return;
      const { setBookmarkToChange } = await import("../lib/repo");
      await runMutation(() =>
        setBookmarkToChange(name.trim(), change.change_id),
      );
    },
    [close, runMutation, selectedChange],
  );

  const forgetBookmark = useCallback(
    async (name: string): Promise<void> => {
      close();
      const { forgetBookmark: forget } = await import("../lib/repo");
      await runMutation(() => forget(name));
    },
    [close, runMutation],
  );

  return {
    overlay,
    changeId,
    // No overlay is opened for one file: a file is acted on from the list.
    path: null,
    openRevset,
    openBookmark,
    close,
    applyBookmark,
    forgetBookmark,
  };
}
