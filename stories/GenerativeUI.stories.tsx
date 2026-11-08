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
  figuresRenderItem,
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
 * read, the parse it checked, the render that drew the program, and the state
 * it read back after the human had used the screen — the program itself painted
 * in the log, with the filter picked and the stepper moved.
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

/**
 * The same kind of answer drawn as figures rather than cells: the change as a
 * tree with what moved in each path, the write-up as sections with their
 * standing, the CI run as stages on a bar, the run's time as spans on one axis —
 * every block counted by the figure at its title's right.
 */
export const figures = chromeStory("figures", () =>
  chat({
    items: [
      userTurn(
        "u-figures",
        "what did this change actually do, and where did the run spend its time?",
        0,
      ),
      figuresRenderItem(),
      {
        ...answer(
          "a-figures",
          "The screen is the change: the tree says which paths moved and by how much, the sections are what the message claims and what each rests on, the CI card is stopped at `test`, and the spans put 460 of the run's 1840 ms on `web_search`.",
        ),
        usage: usage(16_900, 1_480, 0, 1, 4),
      },
    ],
  }),
);
