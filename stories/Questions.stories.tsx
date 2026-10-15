import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { askInChat, chromeStory } from "../.storybook/chrome/chat";
import { ASK_ITEMS } from "../.storybook/fixtures/scenes/photo-strip";
import { ASK_REQUESTS } from "../.storybook/fixtures/ask";

const meta = defineMeta({
  title: "Questions",
  component: ChatApp,
});
export default meta;

export const asked = chromeStory("asked", () =>
  askInChat(
    ASK_REQUESTS.map((request) => request.question),
    ASK_ITEMS,
    { streaming: true, context: 63 },
  ),
);
