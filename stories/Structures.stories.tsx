import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import {
  STRUCTURE_ANSWER,
  TREE_BAD_ITEM,
  TREE_ITEM,
} from "../.storybook/fixtures/structure";
import { answer, usage, userTurn } from "../.storybook/fixtures/turn";

const meta = defineMeta({
  title: "Structures",
  component: ChatApp,
});
export default meta;

/**
 * A folder tree whose rows open under the cursor, its `+N −M` columns measured
 * across the whole tree, and the same call refused because a folder never named
 * itself — the reading walks both back as text, which is how a model that cannot
 * see the picture catches a leaf one level too deep.
 */
export const structured = chromeStory("structured", () =>
  chat({
    items: [
      userTurn(
        "u-structure",
        "the table is gone — show me what the plugin looks like now, and prove the tree still refuses a folder it cannot name",
        0,
      ),
      TREE_ITEM,
      TREE_BAD_ITEM,
      {
        ...answer("a-structure", STRUCTURE_ANSWER),
        usage: usage(9_800, 610, 0, 2, 1),
      },
    ],
  }),
);
