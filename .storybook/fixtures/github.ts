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
  GITHUB_FILE_TOOL,
  GITHUB_PR_TOOL,
  GITHUB_REPO_TOOL,
  GITHUB_TREE_TOOL,
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
    { label: "repo", value: "gpuix/adwaita-gpuix" },
    { label: "description", value: "The Adwaita widget set, drawn on the GPU" },
    { label: "stars", value: "812" },
    { label: "forks", value: "54" },
    { label: "language", value: "TypeScript" },
    { label: "license", value: "MIT" },
    { label: "state", value: "public" },
    { label: "branch", value: "main" },
    { label: "open issues", value: "37" },
    { label: "pushed", value: "2026-11-06 18:12" },
    { label: "url", value: "https://github.com/gpuix/adwaita-gpuix" },
  ],
  rows: [],
  omitted: 0,
  body: "",
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

export const GITHUB_QUESTION =
  "before we touch the row heights, check upstream: has adwaita-gpuix already made the row measure configurable, and what does its tokens file say today?";

export const GITHUB_ANSWER =
  "It landed two weeks ago: gpuix/adwaita-gpuix#418, merged 2 November, made the row measure one number and moved every widget to counting slots from it — `rowSlots(height)` is the only way to ask for more than a line. So we do not need our own row height constant: we budget slots and let `ROW_HEIGHT` stay theirs. The read of `src/lib/tokens/rows.ts` above is the shape we are matching, and the path I guessed first (`src/lib/rowHeight.ts`) does not exist — the file moved under `tokens/`.";
