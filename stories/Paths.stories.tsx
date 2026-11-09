import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { pickMode } from "../src/plugins/core/lib/composer/mode";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { PATH_PICK_ITEMS } from "../.storybook/fixtures/scenes/path-complete";

const meta = defineMeta({
  title: "Paths",
  component: ChatApp,
});
export default meta;

const DRAFT = "read ./src/plugins/core/lib/composer/";

export const completing = chromeStory("completing", () =>
  chat({
    items: PATH_PICK_ITEMS,
    draft: DRAFT,
    initialMode: pickMode("path", DRAFT),
  }),
);
