import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { pickMode } from "../src/plugins/core/lib/composer/mode";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { SESSION_ITEMS } from "../.storybook/fixtures/scenes/photo-strip";

const meta = defineMeta({
  title: "Changes",
  component: ChatApp,
});
export default meta;

export const panel = chromeStory("panel", () =>
  chat({ items: SESSION_ITEMS, initialMode: pickMode("changes") }),
);
