import type { GithubKind } from "./types";

export const GITHUB_REPO_TOOL = "github-repo";
export const GITHUB_FILE_TOOL = "github-file";
export const GITHUB_TREE_TOOL = "github-tree";
export const GITHUB_PR_TOOL = "github-pr";
export const GITHUB_ISSUE_TOOL = "github-issue";
export const GITHUB_RELEASE_TOOL = "github-release";
export const GITHUB_COMMIT_TOOL = "github-commit";
export const GITHUB_SEARCH_TOOL = "github-search";
export const GITHUB_USER_TOOL = "github-user";

/** Every GitHub tool the agent can call, in scope-then-detail order. */
export const GITHUB_TOOL_NAMES: readonly string[] = [
  GITHUB_REPO_TOOL,
  GITHUB_FILE_TOOL,
  GITHUB_TREE_TOOL,
  GITHUB_PR_TOOL,
  GITHUB_ISSUE_TOOL,
  GITHUB_RELEASE_TOOL,
  GITHUB_COMMIT_TOOL,
  GITHUB_SEARCH_TOOL,
  GITHUB_USER_TOOL,
];

/**
 * Which kind each tool reads.
 *
 * A call's own answer names its kind, but a call that is still running has no
 * answer to read one from, and the header has to say what it is doing already —
 * so the header goes from a tool name to a kind, and the kind's own file says the
 * words.
 */
export const GITHUB_TOOL_KINDS: Readonly<Record<string, GithubKind>> = {
  [GITHUB_REPO_TOOL]: "repo",
  [GITHUB_FILE_TOOL]: "file",
  [GITHUB_TREE_TOOL]: "tree",
  [GITHUB_PR_TOOL]: "pr",
  [GITHUB_ISSUE_TOOL]: "issue",
  [GITHUB_RELEASE_TOOL]: "release",
  [GITHUB_COMMIT_TOOL]: "commit",
  [GITHUB_SEARCH_TOOL]: "search",
  [GITHUB_USER_TOOL]: "user",
};

export const GITHUB_TOOL_LABELS: Record<string, string> = {
  [GITHUB_REPO_TOOL]: "GitHub repo",
  [GITHUB_FILE_TOOL]: "GitHub file",
  [GITHUB_TREE_TOOL]: "GitHub folder",
  [GITHUB_PR_TOOL]: "GitHub pull request",
  [GITHUB_ISSUE_TOOL]: "GitHub issue",
  [GITHUB_RELEASE_TOOL]: "GitHub release",
  [GITHUB_COMMIT_TOOL]: "GitHub commit",
  [GITHUB_SEARCH_TOOL]: "GitHub search",
  [GITHUB_USER_TOOL]: "GitHub profile",
};

/** The REST API and the raw file host. One file names them: `lib/api/client.ts`. */
export const API_ROOT = "https://api.github.com";
export const RAW_ROOT = "https://raw.githubusercontent.com";

/** The API version mu asks for, so a response shape does not move under it. */
export const API_VERSION = "2022-11-28";

/** GitHub asks every client to say who it is. */
export const CLIENT_NAME = "mu";

/** How long one request may take before the call answers instead of waiting. */
export const REQUEST_TIMEOUT_MS = 20_000;

/**
 * A GitHub read is a fact about a public repo, not a live stream: mu keeps the
 * answer for a day so a research session does not spend its rate limit rereading
 * the same page. `refresh` is the way back to a live read.
 */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** How many search hits a call answers with. */
export const DEFAULT_SEARCH_LIMIT = 20;
export const MAX_SEARCH_LIMIT = 50;

/** How many entries a folder listing answers with, and how many releases. */
export const MAX_TREE_ROWS = 200;
export const DEFAULT_RELEASE_LIMIT = 10;
export const MAX_RELEASE_LIMIT = 30;

/** How many comments, files and changed files a call answers with. */
export const DEFAULT_COMMENT_LIMIT = 20;
export const MAX_COMMENT_LIMIT = 50;
export const MAX_PR_FILES = 50;
export const MAX_COMMIT_FILES = 100;

/**
 * Inline text budgets, in characters. A file body is the answer of `github-file`
 * and the only thing that may run long; a prose body (a PR, an issue, release
 * notes, a commit message) is context, and what a reader needs of it is the
 * opening.
 */
export const MAX_FILE_CHARS = 20_000;
export const MAX_BODY_CHARS = 4_000;

/** How long one row's trailing text (a comment, a description) runs. */
export const MAX_ROW_TEXT = 200;

/** How many characters of a SHA a row shows. The full sha travels in `target`. */
export const SHORT_SHA = 12;

/** What can be searched, and the kind a call answers with when it names nothing. */
export const SEARCH_KINDS = [
  "repositories",
  "code",
  "issues",
  "commits",
  "users",
] as const;

/**
 * The kinds GitHub only answers for a signed-in account. mu says so before it
 * asks, rather than taking a 401 and calling it a failure of the call.
 */
export const AUTH_ONLY_SEARCH_KINDS: readonly string[] = ["code", "commits"];
