import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { commandsMode } from "../src/plugins/core/lib/composer/mode";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { CONTEXT_FULL_SESSION } from "../.storybook/fixtures/models";
import { COMPOSER_ATTACHMENTS } from "../.storybook/fixtures/composer";
import { COMPOSER_DRAFT_ITEMS } from "../.storybook/fixtures/scenes/composer-ring";

const meta = defineMeta({
  title: "Composer",
  component: ChatApp,
});
export default meta;

export const drafting = chromeStory("drafting", () =>
  chat({
    items: COMPOSER_DRAFT_ITEMS,
    meta: CONTEXT_FULL_SESSION,
    draft:
      "give the ring a track, keep the pills while the draft is empty, and warn me at 85%",
    attachments: COMPOSER_ATTACHMENTS,
    initialMode: commandsMode(),
  }),
);
