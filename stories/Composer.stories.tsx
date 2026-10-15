import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { commandsMode } from "../src/plugins/core/lib/composer/mode";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { CONTEXT_FULL_SESSION } from "../.storybook/fixtures/models";
import { COMPOSER_ATTACHMENTS } from "../.storybook/fixtures/composer";
import { STRIP_FIX_TURN } from "../.storybook/fixtures/scenes/photo-strip";

const meta = defineMeta({
  title: "Composer",
  component: ChatApp,
});
export default meta;

export const drafting = chromeStory("drafting", () =>
  chat({
    items: STRIP_FIX_TURN,
    meta: CONTEXT_FULL_SESSION,
    draft:
      "keep the strip at 48px, anchor the crop on the frame, and make the read preview keep the aspect",
    attachments: COMPOSER_ATTACHMENTS,
    initialMode: commandsMode(),
  }),
);
