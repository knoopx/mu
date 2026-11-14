import type { SEARCH_KINDS } from "./constants";

/**
 * What a GitHub call answers with — one shape for all nine tools.
 *
 * Every tool reads one kind of thing, but they all answer the same three ways:
 * the fields of the one resource it read, the rows of the list it read, and the
 * text body it read. One envelope means one view, one component and one answer
 * builder, and a call that reads nothing still fills all of it — the log paints
 * a failure as a row too.
 */

/**
 * `ok` answered with what was asked for; `empty` reached the thing and found
 * nothing in it; `failed` was told no (no such repo, path, number or tag);
 * `unsupported` never got an answer worth reading (offline, no token, rate
 * limit spent); `binary` read the bytes of a file that is not text.
 */
export type GithubStatus = "ok" | "empty" | "failed" | "unsupported" | "binary";

/** What kind of thing the call read, which is what says how to read its rows. */
export type GithubKind =
  | "repo"
  | "file"
  | "tree"
  | "pr"
  | "issue"
  | "release"
  | "releases"
  | "commit"
  | "search"
  | "user";

/** One short fact about the resource, in the order it should read. */
export interface GithubField {
  label: string;
  value: string;
}

/**
 * One entry of a list: a folder's child, a release, a commit's file, a search
 * hit, an issue's comment. `detail` is where it is or what it says, `state` is
 * the word a badge wears, `figure` is the trailing number.
 */
export interface GithubRow {
  /** 1-based position in the answer; 0 when the list has no ranking */
  rank: number;
  name: string;
  detail: string;
  state: string;
  figure: string;
}

/** What the API said about the quota, when it said anything. */
export interface GithubRate {
  limit: number;
  remaining: number;
}

/**
 * One GitHub call: the scope it was pointed at, what it resolved there, and
 * what it costs to read.
 */
export interface GithubCall {
  status: GithubStatus;
  kind: GithubKind;

  /** `owner/repo`, empty for a search and a profile */
  repo: string;
  /** the branch, tag or sha asked for; empty is the repo's default branch */
  ref: string;
  /** the path asked for, for a file or a folder */
  path: string;
  /** what the call named: a PR or issue number, a sha, a tag, a search kind */
  target: string;
  /** the query, for a search */
  query: string;

  fields: GithubField[];
  rows: GithubRow[];
  /** rows the cap left out of the answer */
  omitted: number;

  /** a file's text, or the prose of a PR, an issue, release notes, a commit message */
  body: string;
  /** characters of that text the budget left out */
  bodyOmitted: number;

  /** the total the API reported when it counts more than it returned */
  total: number;

  cached: boolean;
  ms: number;
  rate: GithubRate;

  error: string;
}

/** The scope fields of an answer, before any status is known. */
export type GithubBlank = Omit<
  GithubCall,
  | "status"
  | "error"
  | "cached"
  | "ms"
  | "rate"
  | "fields"
  | "rows"
  | "body"
  | "total"
  | "omitted"
  | "bodyOmitted"
>;

/** What a call was pointed at, in the words a tool names it in. */
export interface GithubScope {
  owner?: string;
  repo?: string;
  ref?: string;
  path?: string;
  target?: string;
  query?: string;
}

/** The kinds a search call may name, as the constant list words them. */
export type SearchKind = (typeof SEARCH_KINDS)[number];

/**
 * The parameters of the nine tools. Every repository read names an owner and a
 * repo and may ask to skip the cache; what differs is the thing named inside it.
 */
export interface GithubRepoParams {
  owner: string;
  repo: string;
  refresh?: boolean;
}

export interface GithubFileParams extends GithubRepoParams {
  path: string;
  ref?: string;
}

export interface GithubTreeParams extends GithubRepoParams {
  path?: string;
  ref?: string;
}

export interface GithubPullParams extends GithubRepoParams {
  number: number;
  files?: boolean;
}

export interface GithubIssueParams extends GithubRepoParams {
  number: number;
  limit?: number;
}

export interface GithubReleaseParams extends GithubRepoParams {
  tag?: string;
  limit?: number;
}

export interface GithubCommitParams extends GithubRepoParams {
  sha: string;
}

export interface GithubSearchParams {
  query: string;
  kind?: SearchKind;
  limit?: number;
  refresh?: boolean;
}

export interface GithubUserParams {
  login: string;
  refresh?: boolean;
}
