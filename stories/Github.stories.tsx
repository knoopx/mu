import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import {
  GITHUB_ANSWER,
  GITHUB_FILE_ITEM,
  GITHUB_FAILED_ITEM,
  GITHUB_PR_ITEM,
  GITHUB_QUESTION,
  GITHUB_REPO_ITEM,
  GITHUB_TREE_ITEM,
} from "../.storybook/fixtures/github";
import { answer, usage, userTurn } from "../.storybook/fixtures/turn";

const meta = defineMeta({
  title: "Github",
  component: ChatApp,
});
export default meta;

/**
 * The agent checking an upstream project before it changes anything of its own:
 * the repository, one of its folders, one of its files read as text, the pull
 * request that already answered the question, and one path GitHub did not have.
 * Every row is chips for what the call resolved, ranked rows for what it listed,
 * and the body the read carried — the file as code, the pull request as prose.
 */
export const checked = chromeStory("checked", () =>
  chat({
    items: [
      userTurn("u-github", GITHUB_QUESTION, 0),
      GITHUB_REPO_ITEM,
      GITHUB_TREE_ITEM,
      GITHUB_FAILED_ITEM,
      GITHUB_FILE_ITEM,
      GITHUB_PR_ITEM,
      {
        ...answer("a-github", GITHUB_ANSWER),
        usage: usage(11_400, 820, 0, 6, 14),
      },
    ],
  }),
);
