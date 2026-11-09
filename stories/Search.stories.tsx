import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { pickMode } from "../src/plugins/core/lib/composer/mode";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { PROMPT_SEARCH_ITEMS } from "../.storybook/fixtures/scenes/prompt-search";

const meta = defineMeta({
  title: "Search",
  component: ChatApp,
});
export default meta;

const QUERY = "crop";

/** `Ctrl+R` over a long session: the draft is the query, and the rows are the
 *  person's own prompts, newest first, with the session each one belongs to. */
export const prompts = chromeStory("prompts", () =>
  chat({
    items: PROMPT_SEARCH_ITEMS,
    draft: QUERY,
    initialMode: pickMode("userMessageHistory", QUERY),
  }),
);
