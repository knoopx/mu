import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { AGENT_ROWS } from "../.storybook/fixtures/scenes/agent";
import {
  COMMAND_ITEMS,
  LONG_OUTPUT_ITEMS,
  PHOTOS_TURN,
} from "../.storybook/fixtures/scenes/photo-strip";

const meta = defineMeta({
  title: "AgentActions",
  component: ChatApp,
});
export default meta;

export const work = chromeStory("work", () =>
  chat({
    items: [
      ...PHOTOS_TURN,
      ...AGENT_ROWS,
      ...COMMAND_ITEMS,
      ...LONG_OUTPUT_ITEMS,
    ],
  }),
);
