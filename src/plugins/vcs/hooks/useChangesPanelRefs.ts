/**
 * The three lists the changes panel draws.
 *
 * A virtualised list is scrolled by the renderer rather than by the DOM, so
 * every key that moves a selection, a wheel or a page needs the list's own
 * handle. They are created once and passed to what draws them.
 */
import { useRef } from "react";
import { makeDiffScroller } from "adwaita-gpuix";
import type { PublicInstance } from "@gpuix/react";
import type { NativeRenderer } from "@gpuix/native/host";

export interface ChangesPanelRefs {
  stackListRef: { current: PublicInstance | null };
  fileListRef: { current: PublicInstance | null };
  diffRef: { current: PublicInstance | null };

  scrollDiff(down: boolean): void;
}

export function useChangesPanelRefs(
  renderer: NativeRenderer,
): ChangesPanelRefs {
  const stackListRef = useRef<PublicInstance | null>(null);
  const fileListRef = useRef<PublicInstance | null>(null);
  const diffRef = useRef<PublicInstance | null>(null);

  return {
    stackListRef,
    fileListRef,
    diffRef,
    scrollDiff: makeDiffScroller(diffRef, renderer),
  };
}
