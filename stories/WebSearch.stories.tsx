import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { CLOUD_SESSION } from "../.storybook/fixtures/models";
import {
  SEARCH_EMPTY_ITEMS,
  SEARCH_FAILED_ITEMS,
  SEARCH_ITEMS,
} from "../.storybook/fixtures/scenes/photo-strip";

const meta = defineMeta({
  title: "WebSearch",
  component: ChatApp,
});
export default meta;

export const results = chromeStory("results", () =>
  chat({
    items: [...SEARCH_ITEMS, ...SEARCH_FAILED_ITEMS, ...SEARCH_EMPTY_ITEMS],
    meta: CLOUD_SESSION,
  }),
);
