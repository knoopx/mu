import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import {
  PLAN_ANSWER,
  PLAN_BAD_ITEM,
  PLAN_LATER_ITEM,
  PLAN_OPEN_ITEM,
} from "../.storybook/fixtures/plan";
import { answer, usage, userTurn } from "../.storybook/fixtures/turn";

const meta = defineMeta({
  title: "Planning",
  component: ChatApp,
});
export default meta;

/**
 * The agent planning a change before it makes it: a first call refused because
 * one entry carried a standing and nothing to do, the whole list written, and the
 * same list sent again three steps later with the standings moved — each row
 * drawn as the list itself, every step in the colour of where it stands.
 */
export const planned = chromeStory("planned", () =>
  chat({
    items: [
      userTurn(
        "u-plan",
        "add a plan tool to mu — write the work down first",
        0,
      ),
      PLAN_BAD_ITEM,
      PLAN_OPEN_ITEM,
      PLAN_LATER_ITEM,
      {
        ...answer("a-plan", PLAN_ANSWER),
        usage: usage(9_800, 640, 0, 3, 6),
      },
    ],
  }),
);
