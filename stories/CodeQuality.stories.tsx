import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import {
  QUALITY_ANSWER,
  QUALITY_COMPLEXITY_ITEM,
  QUALITY_DUPES_ITEM,
} from "../.storybook/fixtures/quality";
import { answer, usage, userTurn } from "../.storybook/fixtures/turn";

const meta = defineMeta({
  title: "CodeQuality",
  component: ChatApp,
});
export default meta;

export const surveyed = chromeStory("surveyed", () =>
  chat({
    items: [
      userTurn(
        "u-quality",
        "what is the state of this code before I start refactoring?",
        0,
      ),
      QUALITY_COMPLEXITY_ITEM,
      QUALITY_DUPES_ITEM,
      {
        ...answer("a-quality", QUALITY_ANSWER),
        usage: usage(11_800, 940, 0, 1, 3),
      },
    ],
  }),
);
