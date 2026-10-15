import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { pickMode } from "../src/plugins/core/lib/composer/mode";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { PHOTOS_TURN } from "../.storybook/fixtures/scenes/photo-strip";
import { CONTEXT_WARN_SESSION } from "../.storybook/fixtures/models";
import {
  COMPOSER_MODEL_ROWS,
  COMPOSER_THINKING_ROWS,
} from "../.storybook/fixtures/composer";

const meta = defineMeta({
  title: "Models",
  component: ChatApp,
});
export default meta;

export const model = chromeStory("model", () =>
  chat({
    items: PHOTOS_TURN,
    initialMode: pickMode("model"),
    modelRows: COMPOSER_MODEL_ROWS,
    meta: CONTEXT_WARN_SESSION,
  }),
);

export const thinking = chromeStory("thinking", () =>
  chat({
    items: PHOTOS_TURN,
    initialMode: pickMode("thinking"),
    thinkingRows: COMPOSER_THINKING_ROWS,
  }),
);
