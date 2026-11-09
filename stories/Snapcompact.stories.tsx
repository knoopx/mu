import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { SNAPCOMPACT_ITEMS } from "../.storybook/fixtures/scenes/snapcompact";

const meta = defineMeta({
  title: "Snapcompact",
  component: ChatApp,
});
export default meta;

/**
 * A context compacted by photocopy rather than by summary: the note the log
 * shows, the two dense pages the discarded span became, and the replay that
 * puts them back on every request.
 */
export const frames = chromeStory("frames", () =>
  chat({ items: SNAPCOMPACT_ITEMS }),
);
