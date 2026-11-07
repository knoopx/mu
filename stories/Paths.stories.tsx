import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { pickMode } from "../src/plugins/core/lib/composer/mode";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { PHOTOS_TURN } from "../.storybook/fixtures/scenes/photo-strip";

const meta = defineMeta({
  title: "Paths",
  component: ChatApp,
});
export default meta;

const DRAFT = "read ./src/plugins/core/lib/composer/";

export const completing = chromeStory("completing", () =>
  chat({
    items: PHOTOS_TURN,
    draft: DRAFT,
    initialMode: pickMode("path", DRAFT),
  }),
);
