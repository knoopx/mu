import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { pickMode } from "../src/plugins/core/lib/composer/mode";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { FILE_TIDY_ITEMS } from "../.storybook/fixtures/scenes/file-tidy";

const meta = defineMeta({
  title: "Files",
  component: ChatApp,
});
export default meta;

/**
 * `Ctrl+P` over the project: the folder walked as a shell walks it, the file
 * under the cursor previewed beside the list, `Delete` handing the row to the one
 * writer that refuses a folder or a name that walks out of it, and `o` handing it
 * to the editor the user asked for.
 */
export const tidy = chromeStory("tidy", () =>
  chat({
    items: FILE_TIDY_ITEMS,
    initialMode: pickMode("file", "figures/lib"),
  }),
);
