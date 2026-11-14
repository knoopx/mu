import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { PAGE_READ_ITEMS } from "../.storybook/fixtures/scenes/page-read";

const meta = defineMeta({
  title: "WebFetch",
  component: ChatApp,
});
export default meta;

/**
 * The agent going to a library's own page instead of trusting a snippet: one page
 * read and quoted, the same page read again out of mu's day-long cache at 4ms, a
 * long page answered with its opening plus the size of the whole, and a page that
 * never answered, marked as one. The figures under each row and the line counting
 * what the log left out are the plugin's own.
 */
export const read = chromeStory("read", () =>
  chat({
    items: PAGE_READ_ITEMS,
    // The read the scene was asked for is the first one; a log pinned to its tail
    // would crop the row the picture is about.
    followTail: false,
  }),
);
