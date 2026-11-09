import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { askInChat, chromeStory } from "../.storybook/chrome/chat";
import {
  ASK_FORK_ITEMS,
  ASK_FORK_REQUESTS,
} from "../.storybook/fixtures/scenes/ask-fork";

const meta = defineMeta({
  title: "Questions",
  component: ChatApp,
});
export default meta;

/** The fork that needs a person: which rule file to retire, and whether its
 *  fixture cases move first. Nothing runs while the answer is waiting. */
export const asked = chromeStory("asked", () =>
  askInChat(
    ASK_FORK_REQUESTS.map((request) => request.question),
    ASK_FORK_ITEMS,
    { streaming: true, context: 58 },
  ),
);
