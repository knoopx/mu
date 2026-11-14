/**
 * The picture the window is showing full-screen, and the pictures it can walk to.
 *
 * A log's pictures are thumbnails: a file read shows a picture at tile size, a
 * user message shows the ones it carried as small squares, and a change shows an
 * image's two sides squeezed into a preview pane. None of that says what the
 * picture actually looks like, so clicking one puts it up at the size the window
 * can give it.
 *
 * The view is held outside React for the same reason the answer sheet is: the
 * picture outlives the row it was clicked in — that row scrolls away, or the log
 * re-renders under it — and the keys that move it arrive through the window,
 * where no element of the picture has focus.
 *
 * A picture is opened with the pictures it belongs to, not alone: the images of
 * one message or the two sides of one change are one group, and the arrows walk
 * the group. A picture clicked on its own is a group of one, and its arrows are
 * inert.
 */

import { type Shortcut } from "adwaita-gpuix/shortcuts";

/** One picture as the viewer draws it: what it is, and what it is called. */
export interface ViewerPicture {
  /** where the pixels come from — a data URL or a file path, as the row has it */
  src: string;

  /** what the picture answers to: the file it came from, or an alt line */
  title: string;

  /** its kind and size, or which side of a change it is */
  detail: string;
}

/** The group the viewer is walking, and where it stands in it. */
export interface ViewerView {
  pictures: ViewerPicture[];

  active: number;
}

export type ViewerListener = () => void;

/** A keystroke as the viewer reads it: one lower-case code, no modifiers. */
export type ViewerKey = string;

/**
 * The keys a picture takes.
 *
 * The engine of the viewer answers these; `viewerHints` is the same set in the
 * words the screen prints beside them, so a key the picture takes is a key the
 * picture shows and a hint it does not print is a key it does not take. The
 * arrow spellings are both accepted because the window reports a named key in
 * either form, the same way the composer's list keys are read.
 */
const CLOSE_KEYS = new Set(["escape"]);
const BACK_KEYS = new Set(["left", "arrowleft"]);
const FORWARD_KEYS = new Set(["right", "arrowright"]);

export class ImageViewerStore {
  private view: ViewerView | null = null;
  private listeners = new Set<ViewerListener>();

  subscribe = (listener: ViewerListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** The view is a stable object between changes, so it is its own snapshot. */
  getSnapshot = (): ViewerView | null => this.view;

  /** The picture on screen, and the group it belongs to; null when none is up. */
  get current(): ViewerView | null {
    return this.view;
  }

  isOpen = (): boolean => this.view !== null;

  /** Put one picture up, with the pictures it can be walked to. */
  open(pictures: ViewerPicture | readonly ViewerPicture[], active = 0): void {
    const group = (
      Array.isArray(pictures) ? pictures : [pictures as ViewerPicture]
    ).filter((picture) => picture.src !== "");
    if (group.length === 0) return;
    this.view = {
      pictures: group,
      active: Math.min(Math.max(active, 0), group.length - 1),
    };
    this.notify();
  }

  close(): void {
    if (this.view === null) return;
    this.view = null;
    this.notify();
  }

  /** Walk the group. A group of one goes nowhere, and a group wraps. */
  step(delta: number): void {
    const view = this.view;
    if (view === null || view.pictures.length < 2) return;
    const n = view.pictures.length;
    this.view = {
      ...view,
      active: (view.active + delta + n) % n,
    };
    this.notify();
  }

  /**
   * Answer one keystroke: the picture's own keys move or dismiss it, and every
   * other key answers `false` because it belongs to the rest of the app — which
   * is not shown while a picture is up, and stays out by way of
   * `viewerHoldsKeys()`.
   */
  press(key: ViewerKey): boolean {
    const view = this.view;
    if (view === null) return false;
    const k = key.toLowerCase();
    if (CLOSE_KEYS.has(k)) {
      this.close();
      return true;
    }
    if (BACK_KEYS.has(k)) {
      this.step(-1);
      return true;
    }
    if (FORWARD_KEYS.has(k)) {
      this.step(1);
      return true;
    }
    return false;
  }

  private notify(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

/** The window's one viewer: a picture is a window-wide state, not a row's. */
export const imageViewer = new ImageViewerStore();

/** Open one picture on its own. */
export function viewPicture(picture: ViewerPicture): void {
  imageViewer.open(picture);
}

/** Open one picture of a group, in the order the group is drawn in the log. */
export function viewPictures(
  pictures: readonly ViewerPicture[],
  at: number,
): void {
  imageViewer.open(pictures, at);
}

/**
 * Whether a picture is up, and therefore whether the rest of the window may
 * answer a keystroke at all: a panel moving, a draft growing or a session being
 * sent from under a full-screen picture is a change nobody can see.
 */
export const viewerHoldsKeys = (): boolean => imageViewer.isOpen();

const CLOSE_HINT: Shortcut = { id: "close", kbds: ["escape"], desc: "close" };
const BROWSE_HINTS: Shortcut[] = [
  { id: "previous", kbds: ["left"], desc: "previous" },
  { id: "next", kbds: ["right"], desc: "next" },
];

/**
 * The picture's hint line. The arrows are printed only when there is a group to
 * walk: a single picture has no next one, and a chip for a key that does nothing
 * is a promise the screen cannot keep.
 */
export function viewerHints(walking: boolean): Shortcut[] {
  return walking ? [...BROWSE_HINTS, CLOSE_HINT] : [CLOSE_HINT];
}
