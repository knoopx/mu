import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { HISTORY_ITEMS } from "../.storybook/fixtures/scenes/history-tree";
import {
  SESSION_TREE_FIXTURE,
  SESSION_TREE_LEAF_ID,
} from "../.storybook/fixtures/tree";

const meta = defineMeta({
  title: "History",
  component: ChatApp,
});
export default meta;

export const tree = chromeStory("tree", () =>
  chat({
    items: HISTORY_ITEMS,
    initialMode: { kind: "pick", target: "tree", index: 18, query: "" },
    tree: { tree: SESSION_TREE_FIXTURE, leafId: SESSION_TREE_LEAF_ID },
  }),
);
