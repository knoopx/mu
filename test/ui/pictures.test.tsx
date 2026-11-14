/**
 * A picture in the log is a thumbnail; clicking it opens the real one.
 *
 * The viewer is the window's one modal: its ground is its own, its caption names
 * the file and says what the picture is, its keys are the keys it prints, and
 * Escape, a click beside the picture, or its close mark puts it away.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { releaseAll, stage, type Screen } from "../harness";
import { LogSceneView, logScene } from "../stage/log";
import { ImageViewer } from "../../src/plugins/core/components/ImageViewer";
import {
  imageViewer,
  viewPicture,
  viewPictures,
  viewerHints,
} from "../../src/plugins/core/lib/ui/imageViewer";
import {
  PICTURE_VIEW_ITEMS,
  PICTURE_VIEW_SHOWN,
} from "../fixtures/scenes/picture-view";
import { photoFile, photoOf } from "../fixtures/media";

afterEach(releaseAll);

const pictureRow = PICTURE_VIEW_ITEMS.find(
  (item) => item.kind === "tool" && item.name === "read",
)!;

/** The widest image on the page: a picture, not one of the marks a row hangs. */
const biggestImage = (screen: Screen) => {
  let best = null as null | {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  for (const element of screen.every("img")) {
    const bounds = screen.boundsOf(element);
    if (bounds !== null && (best === null || bounds.width > best.width))
      best = bounds;
  }
  return best;
};

const viewerStage = async () => {
  const screen = await stage(
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <ImageViewer />
    </div>,
    { width: 1100, height: 700 },
  );
  await screen.frame();
  return screen;
};

describe("a picture, opened", () => {
  test("the viewer names the file and says what the picture is", async () => {
    viewPicture(PICTURE_VIEW_SHOWN);
    const screen = await viewerStage();
    expect(screen.says(PICTURE_VIEW_SHOWN.title)).toBe(true);
    expect(screen.says(PICTURE_VIEW_SHOWN.detail)).toBe(true);
    // The picture itself is drawn, and it fits the window it was opened in —
    // the widest image on the page is the picture, not one of the row's marks.
    const bounds = biggestImage(screen);
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeGreaterThan(100);
    expect(bounds!.width).toBeLessThanOrEqual(1100);
  });

  test("a click beside the picture puts it away", async () => {
    viewPicture(PICTURE_VIEW_SHOWN);
    const screen = await viewerStage();
    expect(imageViewer.isOpen()).toBe(true);
    // The ground, not the picture: a click on the ground dismisses it.
    const image = biggestImage(screen)!;
    await screen.clickAt(image.x + image.width / 2, 8);
    expect(imageViewer.isOpen()).toBe(false);
    expect(screen.says(PICTURE_VIEW_SHOWN.title)).toBe(false);
  });

  test("the keys the viewer prints are the keys it takes", async () => {
    const group = [
      PICTURE_VIEW_SHOWN,
      {
        src: photoFile("stars").src,
        title: photoOf("stars").path,
        detail: "image/jpeg · 18.3KB",
      },
    ];
    viewPictures(group, 0);
    const screen = await viewerStage();
    // A group that can be walked prints the walking keys, and says where it is.
    const hints = viewerHints(true).map((hint) => hint.desc);
    expect(hints).toContain("previous");
    expect(hints).toContain("next");
    expect(screen.says("1 / 2")).toBe(true);

    expect(imageViewer.press("right")).toBe(true);
    await screen.frame();
    expect(screen.says("2 / 2")).toBe(true);
    expect(imageViewer.press("left")).toBe(true);
    await screen.frame();
    expect(screen.says("1 / 2")).toBe(true);

    // Escape is the picture's key, and the viewer answers it.
    expect(imageViewer.press("escape")).toBe(true);
    await screen.frame();
    expect(imageViewer.isOpen()).toBe(false);
    expect(screen.says(PICTURE_VIEW_SHOWN.title)).toBe(false);
  });

  test("a picture on its own prints no walking keys", async () => {
    // A chip for a key that does nothing is a promise the screen cannot keep.
    expect(viewerHints(false).map((hint) => hint.desc)).toEqual(["close"]);
    expect(viewerHints(true).map((hint) => hint.kbds[0])).toEqual([
      "left",
      "right",
      "escape",
    ]);
  });
});

describe("a thumbnail in the log", () => {
  test("clicking it opens the real picture over the window", async () => {
    const screen = await stage(
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <LogSceneView items={[pictureRow]} project={undefined} />
        <ImageViewer />
      </div>,
      { width: 1100, height: 700 },
    );
    const tile = biggestImage(screen)!;
    expect(tile.width).toBeGreaterThan(40);
    await screen.clickAt(tile.x + tile.width / 2, tile.y + tile.height / 2);
    expect(imageViewer.isOpen()).toBe(true);
    await screen.frame();
    // The overlay now covers the page it was opened over: the picture is drawn
    // bigger than the thumbnail that opened it, and its own name is on the page.
    const opened = biggestImage(screen)!;
    expect(opened.width).toBeGreaterThan(tile.width);
    expect(screen.says(PICTURE_VIEW_SHOWN.title)).toBe(true);
    imageViewer.close();
  });

  test("the log keeps its thumbnail once the picture is put away", async () => {
    const screen = await logScene({ items: [pictureRow] });
    expect(screen.every("img").length).toBeGreaterThan(0);
  });
});
