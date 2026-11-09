import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import {
  STRUCTURE_ANSWER,
  TABLE_BAD_ITEM,
  TABLE_ITEM,
  TREE_ITEM,
} from "../.storybook/fixtures/structure";
import { answer, usage, userTurn } from "../.storybook/fixtures/turn";

const meta = defineMeta({
  title: "Structures",
  component: ChatApp,
});
export default meta;

/**
 * A folder tree whose rows open under the cursor, and a table whose figure
 * columns stand in mono, with the call before them refused for a cell that had
 * no column to stand in — and both readings walking back what a model cannot
 * see.
 */
export const structured = chromeStory("structured", () =>
  chat({
    items: [
      userTurn("u-structure", "show me the plugin's shape, and what each tool cost", 0),
      TREE_ITEM,
      TABLE_BAD_ITEM,
      TABLE_ITEM,
      {
        ...answer("a-structure", STRUCTURE_ANSWER),
        usage: usage(11_400, 690, 0, 3, 1),
      },
    ],
  }),
);
