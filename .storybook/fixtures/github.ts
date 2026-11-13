/**
 * A GitHub research pass, frozen.
 *
 * The story shows the agent checking an upstream project before it changes
 * something of its own: the repository, one of its folders, one of its files,
 * the pull request that already answered the question, and one read GitHub
 * refused. Nothing here reaches the network — the calls are the answers GitHub
 * gave, written out as the `details` shape the log reads, with the model's text
 * built by the plugin's own answer builder so the row and the text cannot drift.
 */

import {
  GITHUB_COMMIT_TOOL,
  GITHUB_FILE_TOOL,
  GITHUB_ISSUE_TOOL,
  GITHUB_PR_TOOL,
  GITHUB_RELEASE_TOOL,
  GITHUB_REPO_TOOL,
  GITHUB_SEARCH_TOOL,
  GITHUB_TREE_TOOL,
  GITHUB_USER_TOOL,
} from "../../src/plugins/github/constants";
import { githubAnswerOf } from "../../src/plugins/github/lib/answer";
import type { GithubCall } from "../../src/plugins/github/types";
import { toolCallFixture, type ToolFixture } from "./tool";

const NO_RATE = { limit: 60, remaining: 41 };

/** The repository, read from mu's cache rather than off the network. */
export const GITHUB_REPO_CALL: GithubCall = {
  status: "ok",
  kind: "repo",
  repo: "gpuix/adwaita-gpuix",
  ref: "",
  path: "",
  target: "",
  query: "",
  fields: [
    { label: "stars", value: "812" },
    { label: "forks", value: "54" },
    { label: "language", value: "TypeScript" },
    { label: "license", value: "MIT" },
    { label: "branch", value: "main" },
    { label: "open issues", value: "37" },
    { label: "pushed", value: "2026-11-06 18:12" },
    { label: "url", value: "https://github.com/gpuix/adwaita-gpuix" },
  ],
  rows: [],
  omitted: 0,
  body: "The Adwaita widget set, drawn on the GPU.",
  bodyOmitted: 0,
  total: 0,
  cached: true,
  ms: 0,
  rate: NO_RATE,
  error: "",
};

/** One folder of it, as the shape of the project before anything is read. */
export const GITHUB_TREE_CALL: GithubCall = {
  status: "ok",
  kind: "tree",
  repo: "gpuix/adwaita-gpuix",
  ref: "",
  path: "src/lib",
  target: "",
  query: "",
  fields: [
    { label: "folder", value: "src/lib" },
    { label: "ref", value: "(default)" },
    { label: "entries", value: "7" },
  ],
  rows: [
    {
      rank: 1,
      name: "theme",
      detail: "src/lib/theme",
      state: "dir",
      figure: "",
    },
    {
      rank: 2,
      name: "tokens",
      detail: "src/lib/tokens",
      state: "dir",
      figure: "",
    },
    {
      rank: 3,
      name: "measure.ts",
      detail: "src/lib/measure.ts",
      state: "file",
      figure: "4 KB",
    },
    {
      rank: 4,
      name: "rows.ts",
      detail: "src/lib/rows.ts",
      state: "file",
      figure: "11 KB",
    },
    {
      rank: 5,
      name: "scale.ts",
      detail: "src/lib/scale.ts",
      state: "file",
      figure: "6 KB",
    },
    {
      rank: 6,
      name: "text.ts",
      detail: "src/lib/text.ts",
      state: "file",
      figure: "3 KB",
    },
    {
      rank: 7,
      name: "types.ts",
      detail: "src/lib/types.ts",
      state: "file",
      figure: "2 KB",
    },
  ],
  omitted: 0,
  body: "",
  bodyOmitted: 0,
  total: 7,
  cached: false,
  ms: 214,
  rate: NO_RATE,
  error: "",
};

/** One file of it, with the text itself. */
export const GITHUB_FILE_CALL: GithubCall = {
  status: "ok",
  kind: "file",
  repo: "gpuix/adwaita-gpuix",
  ref: "",
  path: "src/lib/tokens/rows.ts",
  target: "",
  query: "",
  fields: [
    { label: "file", value: "rows.ts" },
    { label: "path", value: "src/lib/tokens/rows.ts" },
    { label: "ref", value: "(default)" },
    { label: "size", value: "5 KB" },
    { label: "sha", value: "4c1f7be02a9d" },
    { label: "lines", value: "48" },
  ],
  rows: [],
  omitted: 0,
  body: [
    "/**",
    " * The measure of a one-line row.",
    " *",
    " * Every list in the kit stands on this number, so a widget that wants a",
    " * taller row takes a slot count rather than writing a pixel value.",
    " */",
    "export const ROW_HEIGHT = 24;",
    "",
    "export const rowBox = (scale: number): number => ROW_HEIGHT * scale;",
    "",
    "export const rowSlots = (height: number): number =>",
    "  Math.max(1, Math.round(height / ROW_HEIGHT));",
  ].join("\n"),
  bodyOmitted: 0,
  total: 0,
  cached: false,
  ms: 187,
  rate: NO_RATE,
  error: "",
};

/** The pull request upstream that already made the measure configurable. */
export const GITHUB_PR_CALL: GithubCall = {
  status: "ok",
  kind: "pr",
  repo: "gpuix/adwaita-gpuix",
  ref: "",
  path: "",
  target: "#418",
  query: "",
  fields: [
    { label: "pr", value: "#418" },
    { label: "title", value: "Let a widget budget its own row slots" },
    { label: "state", value: "merged" },
    { label: "author", value: "niamh" },
    { label: "created", value: "2026-10-29 09:41" },
    { label: "head", value: "gpuix:row-slots" },
    { label: "base", value: "gpuix:main" },
    { label: "commits", value: "3" },
    { label: "changes", value: "+96 −41" },
    { label: "files", value: "4" },
    { label: "merged", value: "2026-11-02 15:07" },
  ],
  rows: [
    {
      rank: 1,
      name: "src/lib/tokens/rows.ts",
      detail: "",
      state: "modified",
      figure: "+22 −6",
    },
    {
      rank: 2,
      name: "src/components/List.tsx",
      detail: "",
      state: "modified",
      figure: "+38 −21",
    },
    {
      rank: 3,
      name: "src/components/Table.tsx",
      detail: "",
      state: "modified",
      figure: "+27 −14",
    },
    {
      rank: 4,
      name: "docs/measure.md",
      detail: "",
      state: "added",
      figure: "+9 −0",
    },
  ],
  omitted: 0,
  body: [
    "A widget that needed a taller row was writing its own height, and the lists above it never knew.",
    "",
    "`rowSlots(height)` is now the only way to ask for more than one line, and every row in the kit budgets its slots from it. Nothing can write a bare row height again, which is the point: the measure stays one number and the widgets disagree by counting.",
  ].join("\n"),
  bodyOmitted: 0,
  total: 4,
  cached: false,
  ms: 402,
  rate: NO_RATE,
  error: "",
};

/** A path the agent guessed and GitHub did not have. */
export const GITHUB_FAILED_CALL: GithubCall = {
  status: "failed",
  kind: "file",
  repo: "gpuix/adwaita-gpuix",
  ref: "",
  path: "src/lib/rowHeight.ts",
  target: "",
  query: "",
  fields: [],
  rows: [],
  omitted: 0,
  body: "",
  bodyOmitted: 0,
  total: 0,
  cached: false,
  ms: 168,
  rate: NO_RATE,
  error:
    "not found: repos/gpuix/adwaita-gpuix/contents/src/lib/rowHeight.ts — no such repository, ref, path, number or tag",
};

/** One commit on the trunk, read as the change it made. */
export const GITHUB_COMMIT_CALL: GithubCall = {
  status: "ok",
  kind: "commit",
  repo: "gpuix/adwaita-gpuix",
  ref: "",
  path: "",
  target: "8f3c21a",
  query: "",
  fields: [
    { label: "commit", value: "8f3c21a" },
    {
      label: "description",
      value: "theme: drive the whole accent ramp from one colour",
    },
    { label: "author", value: "Niamh Ní Dhomhnaill (niamh@gpuix.dev)" },
    { label: "date", value: "2026-11-04 11:26" },
    { label: "changes", value: "+64 −22" },
    { label: "files", value: "3" },
    {
      label: "url",
      value: "https://github.com/gpuix/adwaita-gpuix/commit/8f3c21a",
    },
  ],
  rows: [
    {
      rank: 1,
      name: "src/theme/adwaita.ts",
      detail: "",
      state: "modified",
      figure: "+41 −9",
    },
    {
      rank: 2,
      name: "src/theme/code.ts",
      detail: "",
      state: "modified",
      figure: "+18 −13",
    },
    {
      rank: 3,
      name: "src/theme/README.md",
      detail: "",
      state: "added",
      figure: "+5 −0",
    },
  ],
  omitted: 0,
  body: "Every tone that was a hand-picked hex is now mixed off the accent, so picking an accent in the picker moves the ramp with it.\n\n`divider.faint` stays a hairline colour and nothing else, which is the rule this commit writes down.",
  bodyOmitted: 0,
  total: 3,
  cached: false,
  ms: 288,
  rate: NO_RATE,
  error: "",
};

/** An open issue: its body, and the thread that has accumulated on it. */
export const GITHUB_ISSUE_CALL: GithubCall = {
  status: "ok",
  kind: "issue",
  repo: "gpuix/adwaita-gpuix",
  ref: "",
  path: "",
  target: "#391",
  query: "",
  fields: [
    { label: "issue", value: "#391" },
    {
      label: "title",
      value: "ContributionHeatmap cells ignore the accent ramp",
    },
    { label: "author", value: "teodor" },
    { label: "created", value: "2026-11-01 08:14" },
    { label: "state", value: "open" },
    { label: "labels", value: "bug, theme" },
    { label: "comments", value: "7" },
    {
      label: "url",
      value: "https://github.com/gpuix/adwaita-gpuix/issues/391",
    },
  ],
  rows: [
    {
      rank: 1,
      name: "kosp",
      detail:
        "The cells read `t.color.accent.tint` once at build time, so the picker cannot move them.",
      state: "",
      figure: "2026-11-01 12:02",
    },
    {
      rank: 2,
      name: "niamh",
      detail:
        "Confirmed — same root as the code palette. Fixing it under the accent commit rather than here.",
      state: "",
      figure: "2026-11-04 11:31",
    },
    {
      rank: 3,
      name: "milan",
      detail:
        "Still wrong on nightsky: the empty cells are the card colour, so the grid disappears.",
      state: "",
      figure: "2026-11-06 19:47",
    },
  ],
  omitted: 4,
  body: "Pick an accent, and the heatmap keeps its old squares. The ten cells of a week should get darker towards the accent the rest of the window moved to; instead they stay wherever the theme was built.\n\nRepro: nightsky, default accent, then move the accent to amber.",
  bodyOmitted: 0,
  total: 7,
  cached: false,
  ms: 356,
  rate: NO_RATE,
  error: "",
};

/** What the project has published, newest first. */
export const GITHUB_RELEASES_CALL: GithubCall = {
  status: "ok",
  kind: "releases",
  repo: "gpuix/adwaita-gpuix",
  ref: "",
  path: "",
  target: "",
  query: "",
  fields: [{ label: "releases", value: "4" }],
  rows: [
    {
      rank: 1,
      name: "v0.14.0",
      detail: "v0.14.0",
      state: "",
      figure: "2026-11-04",
    },
    {
      rank: 2,
      name: "v0.14.0-rc1",
      detail: "v0.14.0-rc1",
      state: "prerelease",
      figure: "2026-10-27",
    },
    {
      rank: 3,
      name: "v0.13.2",
      detail: "v0.13.2",
      state: "",
      figure: "2026-10-12",
    },
    {
      rank: 4,
      name: "v0.13.0",
      detail: "v0.13.0",
      state: "",
      figure: "2026-09-30",
    },
  ],
  omitted: 0,
  body: "",
  bodyOmitted: 0,
  total: 4,
  cached: true,
  ms: 0,
  rate: NO_RATE,
  error: "",
};

/** A search of GitHub, and what its three repository hits are. */
export const GITHUB_SEARCH_CALL: GithubCall = {
  status: "ok",
  kind: "search",
  repo: "",
  ref: "",
  path: "",
  target: "repositories",
  query: "gpuix",
  fields: [
    { label: "kind", value: "repositories" },
    { label: "total", value: "59" },
    { label: "shown", value: "3" },
  ],
  rows: [
    {
      rank: 1,
      name: "gpuix/gpuix",
      detail: "GPU-rendered desktop applications, written in Rust",
      state: "Rust",
      figure: "1204",
    },
    {
      rank: 2,
      name: "gpuix/adwaita-gpuix",
      detail: "The Adwaita widget set, drawn on the GPU",
      state: "TypeScript",
      figure: "812",
    },
    {
      rank: 3,
      name: "gpuix/react",
      detail: "React reconciler for the gpuix scene graph",
      state: "TypeScript",
      figure: "241",
    },
  ],
  omitted: 0,
  body: "",
  bodyOmitted: 0,
  total: 59,
  cached: false,
  ms: 812,
  rate: NO_RATE,
  error: "",
};

/** The person who landed the accent change. */
export const GITHUB_USER_CALL: GithubCall = {
  status: "ok",
  kind: "user",
  repo: "",
  ref: "",
  path: "",
  target: "niamh",
  query: "",
  fields: [
    { label: "login", value: "niamh" },
    { label: "name", value: "Niamh Ní Dhomhnaill" },
    { label: "type", value: "User" },
    { label: "company", value: "gpuix" },
    { label: "location", value: "Gaillimh" },
    { label: "repos", value: "34" },
    { label: "gists", value: "6" },
    { label: "followers", value: "412" },
    { label: "following", value: "118" },
    { label: "joined", value: "2019-04-11" },
    { label: "url", value: "https://github.com/niamh" },
  ],
  rows: [],
  omitted: 0,
  body: "Draws interfaces on GPUs. Keeps a single number for every measure and makes the widgets argue about it.",
  bodyOmitted: 0,
  total: 0,
  cached: false,
  ms: 214,
  rate: NO_RATE,
  error: "",
};

const argsOf = (call: GithubCall): Record<string, unknown> => ({
  owner: "gpuix",
  repo: "adwaita-gpuix",
  ...(call.path === "" ? {} : { path: call.path }),
  ...(call.target === "" ? {} : { number: 418 }),
});

export const GITHUB_REPO_ITEM: ToolFixture = toolCallFixture(
  "call-github-repo",
  GITHUB_REPO_TOOL,
  { owner: "gpuix", repo: "adwaita-gpuix" },
  "ok",
  githubAnswerOf(GITHUB_REPO_CALL),
  { details: GITHUB_REPO_CALL },
);

export const GITHUB_TREE_ITEM: ToolFixture = toolCallFixture(
  "call-github-tree",
  GITHUB_TREE_TOOL,
  { owner: "gpuix", repo: "adwaita-gpuix", path: "src/lib" },
  "ok",
  githubAnswerOf(GITHUB_TREE_CALL),
  { details: GITHUB_TREE_CALL },
);

export const GITHUB_FILE_ITEM: ToolFixture = toolCallFixture(
  "call-github-file",
  GITHUB_FILE_TOOL,
  { owner: "gpuix", repo: "adwaita-gpuix", path: "src/lib/tokens/rows.ts" },
  "ok",
  githubAnswerOf(GITHUB_FILE_CALL),
  { details: GITHUB_FILE_CALL },
);

export const GITHUB_PR_ITEM: ToolFixture = toolCallFixture(
  "call-github-pr",
  GITHUB_PR_TOOL,
  { owner: "gpuix", repo: "adwaita-gpuix", number: 418, files: true },
  "ok",
  githubAnswerOf(GITHUB_PR_CALL),
  { details: GITHUB_PR_CALL },
);

export const GITHUB_FAILED_ITEM: ToolFixture = toolCallFixture(
  "call-github-missing",
  GITHUB_FILE_TOOL,
  argsOf(GITHUB_FAILED_CALL),
  "error",
  githubAnswerOf(GITHUB_FAILED_CALL),
  { details: GITHUB_FAILED_CALL },
);

export const GITHUB_COMMIT_ITEM: ToolFixture = toolCallFixture(
  "call-github-commit",
  GITHUB_COMMIT_TOOL,
  { owner: "gpuix", repo: "adwaita-gpuix", sha: "8f3c21a" },
  "ok",
  githubAnswerOf(GITHUB_COMMIT_CALL),
  { details: GITHUB_COMMIT_CALL },
);

export const GITHUB_ISSUE_ITEM: ToolFixture = toolCallFixture(
  "call-github-issue",
  GITHUB_ISSUE_TOOL,
  { owner: "gpuix", repo: "adwaita-gpuix", number: 391, limit: 3 },
  "ok",
  githubAnswerOf(GITHUB_ISSUE_CALL),
  { details: GITHUB_ISSUE_CALL },
);

export const GITHUB_RELEASES_ITEM: ToolFixture = toolCallFixture(
  "call-github-releases",
  GITHUB_RELEASE_TOOL,
  { owner: "gpuix", repo: "adwaita-gpuix" },
  "ok",
  githubAnswerOf(GITHUB_RELEASES_CALL),
  { details: GITHUB_RELEASES_CALL },
);

export const GITHUB_SEARCH_ITEM: ToolFixture = toolCallFixture(
  "call-github-search",
  GITHUB_SEARCH_TOOL,
  { query: "gpuix", kind: "repositories", limit: 3 },
  "ok",
  githubAnswerOf(GITHUB_SEARCH_CALL),
  { details: GITHUB_SEARCH_CALL },
);

export const GITHUB_USER_ITEM: ToolFixture = toolCallFixture(
  "call-github-user",
  GITHUB_USER_TOOL,
  { login: "niamh" },
  "ok",
  githubAnswerOf(GITHUB_USER_CALL),
  { details: GITHUB_USER_CALL },
);

export const GITHUB_QUESTION =
  "before we touch the row heights, check upstream: has adwaita-gpuix already made the row measure configurable, and what does its tokens file say today?";

export const GITHUB_THREAD_QUESTION =
  "who keeps breaking the theme, and what has this project shipped lately? check the open theme issue, the last few releases, the commit that touched the accent ramp, and who wrote it.";

export const GITHUB_THREAD_ANSWER =
  "Three people, and not the same one twice: the heatmap issue (#391) has been open since 1 November with three replies in it and four more GitHub did not send, the accent ramp was actually fixed by `8f3c21a` on 4 November, and the newest thing the project has published is `v0.14.0`, also 4 November — after an `rc1` a week earlier. The person who wrote the accent change is `niamh`, who also replied on #391 the same morning, so the fix and the issue are the same thread of work.";

export const GITHUB_ANSWER =
  "It landed two weeks ago: gpuix/adwaita-gpuix#418, merged 2 November, made the row measure one number and moved every widget to counting slots from it — `rowSlots(height)` is the only way to ask for more than a line. So we do not need our own row height constant: we budget slots and let `ROW_HEIGHT` stay theirs. The read of `src/lib/tokens/rows.ts` above is the shape we are matching, and the path I guessed first (`src/lib/rowHeight.ts`) does not exist — the file moved under `tokens/`.";
