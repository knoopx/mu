import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { AGENT_JOB_ITEMS } from "../.storybook/fixtures/scenes/agent-jobs";

const meta = defineMeta({
  title: "AgentActions",
  component: ChatApp,
});
export default meta;

/** Every row state at once: a call still open, one that failed and kept its
 *  error, a photo read, an edit with its diff, an answer cut short at 2x. */
export const work = chromeStory("work", () =>
  chat({ items: AGENT_JOB_ITEMS }),
);
