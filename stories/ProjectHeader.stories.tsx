import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";

const meta = defineMeta({
  title: "ProjectHeader",
  component: ChatApp,
});
export default meta;

export const opens = chromeStory("opens", () => chat({ items: [] }));
