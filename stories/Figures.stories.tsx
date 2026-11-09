import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import {
  CHART_ANSWER,
  CHART_BAD_ITEM,
  CHART_ITEM,
} from "../.storybook/fixtures/chart";
import { answer, usage, userTurn } from "../.storybook/fixtures/turn";

const meta = defineMeta({
  title: "Figures",
  component: ChatApp,
});
export default meta;

/**
 * The agent plotting numbers: one call whose values came out of a spreadsheet
 * with a comma in one of them, the same call fixed, and the plot both rows are
 * about — drawn in the log from the points themselves, with the axis, the range
 * and the peak read back to a model that cannot see it.
 */
export const plotted = chromeStory("plotted", () =>
  chat({
    items: [
      userTurn("u-chart", "chart the commit activity for this year", 0),
      CHART_BAD_ITEM,
      CHART_ITEM,
      {
        ...answer("a-chart", CHART_ANSWER),
        usage: usage(9_100, 540, 0, 2, 1),
      },
    ],
  }),
);


