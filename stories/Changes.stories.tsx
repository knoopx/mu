import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { pickMode } from "../src/plugins/core/lib/composer/mode";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import {
  CHANGE_STACK_ITEMS,
  OPLOG_ITEMS,
} from "../.storybook/fixtures/scenes/change-stack";


const meta = defineMeta({
  title: "Changes",
  component: ChatApp,
});
export default meta;

export const panel = chromeStory("panel", () =>
  chat({ items: CHANGE_STACK_ITEMS, initialMode: pickMode("changes") }),
);



export const oplog = chromeStory("oplog", () =>
  chat({ items: OPLOG_ITEMS, initialMode: pickMode("oplog") }),
);
