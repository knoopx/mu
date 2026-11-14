import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import {
  SESSION_ITEMS,
  STREAM_TURN,
} from "../.storybook/fixtures/scenes/photo-strip";

const meta = defineMeta({
  title: "Chat",
  component: ChatApp,
});
export default meta;

/** The window: a session mid-answer, the bar reading its own figures. */
export const session = chromeStory("session", () =>
  chat({
    items: [...SESSION_ITEMS, ...STREAM_TURN],
    streaming: true,
  }),
);
