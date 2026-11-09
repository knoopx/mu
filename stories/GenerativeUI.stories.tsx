import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import {
  OPENUI_ANSWER,
  OPENUI_LIST_ITEM,
  OPENUI_PROMPT_ITEM,
  OPENUI_RENDER_ITEM,
  OPENUI_STATE_ITEM,
  OPENUI_VALIDATE_ITEM,
  seedOpenUIScreen,
} from "../.storybook/fixtures/openui";
import { answer, usage, userTurn } from "../.storybook/fixtures/turn";

const meta = defineMeta({
  title: "GenerativeUI",
  component: ChatApp,
});
export default meta;

/**
 * The agent answering with a screen instead of a paragraph: the reference it
 * read, the parse it checked, the render that drew the program, and the state it
 * read back after the human had used the screen — the program itself painted in
 * the log, with the filter picked and the stepper moved.
 */
export const rendered = chromeStory("rendered", () => {
  seedOpenUIScreen();
  return chat({
    items: [
      userTurn(
        "u-ui",
        "show me the files this change moved and let me pick how to split it",
        0,
      ),
      OPENUI_PROMPT_ITEM,
      OPENUI_VALIDATE_ITEM,
      OPENUI_RENDER_ITEM,
      OPENUI_STATE_ITEM,
      OPENUI_LIST_ITEM,
      {
        ...answer("a-ui", OPENUI_ANSWER),
        usage: usage(15_400, 1_120, 0, 1, 2),
      },
    ],
  });
});
