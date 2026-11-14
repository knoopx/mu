import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { viewPicture } from "../src/plugins/core/lib/ui/imageViewer";
import {
  PICTURE_VIEW_ITEMS,
  PICTURE_VIEW_SHOWN,
} from "../.storybook/fixtures/scenes/picture-view";

const meta = defineMeta({
  title: "Pictures",
  component: ChatApp,
});
export default meta;

/** A picture clicked over in the log fills the window on a ground of its own,
 *  with the file it came from and its kind and size under it. Escape, or a click
 *  beside it, puts it away. */
export const viewing = chromeStory("viewing", () => {
  const scene = chat({ items: PICTURE_VIEW_ITEMS });
  viewPicture(PICTURE_VIEW_SHOWN);
  return scene;
});
