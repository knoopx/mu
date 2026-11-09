import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { DOCUMENT_ITEMS } from "../.storybook/fixtures/scenes/documents";

const meta = defineMeta({
  title: "Documents",
  component: ChatApp,
});
export default meta;

/** The log read as a document — a written file, its table, and an answer that
 *  was stopped mid-sentence and stayed where it stopped. */
export const documents = chromeStory("documents", () =>
  chat({ items: DOCUMENT_ITEMS }),
);
