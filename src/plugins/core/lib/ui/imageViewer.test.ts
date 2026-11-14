/**
 * The full-screen picture.
 *
 * The view is window-wide state rather than a row's, so three things have to hold
 * of it and none is visible from the component that draws it: the keys the picture
 * answers are the keys it prints (Escape puts it away, and the arrows are printed
 * only when there is a group to walk), a group wraps without losing its place, and
 * the snapshot a subscription reads does not change unless the view does — or the
 * window would redraw itself on every keystroke that came while a picture was up.
 */
import { describe, expect, test } from "bun:test";

import { ImageViewerStore, viewerHints } from "./imageViewer";

const picture = (name: string) => ({
  src: `data:${name}`,
  title: name,
  detail: "png · 1 kB",
});

describe("ImageViewerStore", () => {
  test("Escape puts the picture away", () => {
    const viewer = new ImageViewerStore();
    viewer.open(picture("a"));
    expect(viewer.press("escape")).toBe(true);
    expect(viewer.isOpen()).toBe(false);
  });

  test("a keystroke is inert while no picture is up", () => {
    const viewer = new ImageViewerStore();
    expect(viewer.press("escape")).toBe(false);
    expect(viewer.press("right")).toBe(false);
  });

  test("a picture on its own has no next one, and still takes the arrow", () => {
    const viewer = new ImageViewerStore();
    viewer.open(picture("a"));
    expect(viewer.press("right")).toBe(true);
    expect(viewer.current?.active).toBe(0);
  });

  test("the arrows walk a group and wrap at its ends", () => {
    const viewer = new ImageViewerStore();
    viewer.open([picture("a"), picture("b"), picture("c")], 1);
    expect(viewer.press("arrowright")).toBe(true);
    expect(viewer.current?.active).toBe(2);
    viewer.press("right");
    expect(viewer.current?.active).toBe(0);
    viewer.press("left");
    expect(viewer.current?.active).toBe(2);
  });

  test("a picture with no pixels never opens", () => {
    const viewer = new ImageViewerStore();
    viewer.open({ src: "", title: "", detail: "" });
    expect(viewer.isOpen()).toBe(false);
  });

  test("the hint line names the keys the picture takes", () => {
    expect(viewerHints(false).map((s) => s.kbds)).toEqual([["escape"]]);
    expect(viewerHints(true).map((s) => s.id)).toEqual([
      "previous",
      "next",
      "close",
    ]);
  });

  test("the snapshot holds still until the view moves", () => {
    const viewer = new ImageViewerStore();
    expect(viewer.getSnapshot()).toBeNull();
    viewer.open([picture("a"), picture("b")]);
    const opened = viewer.getSnapshot();
    expect(viewer.getSnapshot()).toBe(opened);
    viewer.press("right");
    expect(viewer.getSnapshot()).not.toBe(opened);
    expect(viewer.getSnapshot()?.active).toBe(1);
  });

  test("a subscription hears the open and the close, and nothing else", () => {
    const viewer = new ImageViewerStore();
    let heard = 0;
    const off = viewer.subscribe(() => (heard += 1));
    viewer.open(picture("a"));
    viewer.close();
    viewer.close();
    viewer.press("right");
    off();
    viewer.open(picture("b"));
    expect(heard).toBe(2);
  });
});
