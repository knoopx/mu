import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import {
  GITHUB_ANSWER,
  GITHUB_COMMIT_ITEM,
  GITHUB_FILE_ITEM,
  GITHUB_FAILED_ITEM,
  GITHUB_ISSUE_ITEM,
  GITHUB_PR_ITEM,
  GITHUB_QUESTION,
  GITHUB_RELEASES_ITEM,
  GITHUB_REPO_ITEM,
  GITHUB_SEARCH_ITEM,
  GITHUB_THREAD_ANSWER,
  GITHUB_THREAD_QUESTION,
  GITHUB_TREE_ITEM,
  GITHUB_USER_ITEM,
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
 * Each row is the UI that kind of thing has — a record's figures, a folder's tree, a
 * file's text, a change's rows and their histogram — not one list wearing nine
 * different names.
 */
export const checked = chromeStory(
  "checked",
  () =>
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
      // A GitHub scene is a run of cards, not a row of one-line log entries, so the
      // log stands at its first row: a log pinned to its tail leaves the card the run
      // opened with — the one that says what was asked — off the top of the picture.
      followTail: false,
    }),
);

/**
 * The same plugin reading the parts of a project that are not records: a commit as
 * the change it made, an issue as the thread it is, a release list as the track of
 * dates it is, a search as a hit list where every hit wears the mark of what it is,
 * and a profile as a face and a handful of counts. `Github` is two scenes because
 * the nine tools answer with nine shapes and one window cannot hold them.
 */
export const threads = chromeStory(
  "threads",
  () =>
    chat({
      items: [
        userTurn("u-github-thread", GITHUB_THREAD_QUESTION, 0),
        GITHUB_COMMIT_ITEM,
        GITHUB_SEARCH_ITEM,
        GITHUB_RELEASES_ITEM,
        GITHUB_ISSUE_ITEM,
        GITHUB_USER_ITEM,
        {
          ...answer("a-github-thread", GITHUB_THREAD_ANSWER),
          usage: usage(9_800, 640, 0, 5, 12),
        },
      ],
      followTail: false,
    }),
);
