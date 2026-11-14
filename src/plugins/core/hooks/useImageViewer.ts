import { useEffect, useSyncExternalStore } from "react";
import type { EventPayload } from "@gpuix/native";

import { addInputListener } from "../../../window/window";
import { imageViewer, type ViewerView } from "../lib/ui/imageViewer";

const lowerKeyOf = (event: EventPayload): string =>
  (event.key ?? "").toLowerCase();

/**
 * The picture the window is showing, and the keys of the picture.
 *
 * The keys come through the window listener because a full-screen picture owns
 * no focusable element: the log keeps its focus and the draft keeps its caret,
 * and Escape still belongs to the picture while it is up. A held key is ignored,
 * so an arrow held down does not run a group away past the picture the reader
 * stopped at.
 *
 * Mounting this hook is what makes the picture answer its keys; the composer's
 * own router asks the viewer whether it holds the window (see
 * `lib/composer/keyRouter.ts`) so nothing else moves underneath.
 */
export function useImageViewer(): ViewerView | null {
  const view = useSyncExternalStore(
    imageViewer.subscribe,
    imageViewer.getSnapshot,
    imageViewer.getSnapshot,
  );

  useEffect(
    () =>
      addInputListener((event) => {
        // The store answers the key only while a picture is up, so the listener
        // stays mounted for the life of the window and reads no stale view.
        if (event.isHeld === true) return;
        imageViewer.press(lowerKeyOf(event));
      }),
    [],
  );

  return view;
}
