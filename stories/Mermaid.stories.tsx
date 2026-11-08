import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import {
  DIAGRAM_ANSWER,
  DIAGRAM_FAILED_ITEM,
  DIAGRAM_ITEM,
} from "../.storybook/fixtures/diagram";
import { answer, usage, userTurn } from "../.storybook/fixtures/turn";

const meta = defineMeta({
  title: "Mermaid",
  component: ChatApp,
});
export default meta;

/**
 * The agent drawing a diagram: one call the parser refused, the same call fixed,
 * and the picture both rows are about — painted in the log, at the size the log
 * has, with the labels the diagram says read back to the model.
 */
export const drawn = chromeStory("drawn", () =>
  chat({
    items: [
      userTurn("u-diagram", "draw how the pieces of this app fit together", 0),
      DIAGRAM_FAILED_ITEM,
      DIAGRAM_ITEM,
      {
        ...answer("a-diagram", DIAGRAM_ANSWER),
        usage: usage(9_400, 610, 0, 2, 1),
      },
    ],
  }),
);
