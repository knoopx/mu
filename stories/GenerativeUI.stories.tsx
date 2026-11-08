import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import {
  OPENUI_RENDER_ITEM,
  putProgramInLog,
} from "../.storybook/fixtures/openui";
import { answer, usage, userTurn } from "../.storybook/fixtures/turn";

const meta = defineMeta({
  title: "GenerativeUI",
  component: ChatApp,
});
export default meta;

export const rendered = chromeStory("rendered", () => {
  putProgramInLog();
  return chat({
    items: [
      userTurn(
        "u-genui",
        "give me the portfolio as a screen I can actually work on, not a table in prose",
        0,
      ),
      OPENUI_RENDER_ITEM,
      {
        ...answer("a-genui", "the positions screen is in the log — the filter row and the sort combo drive the list, and every row sends its ticker back to me when you press it."),
        usage: usage(9_400, 1_120, 0, 1, 2),
      },
    ],
  });
});
