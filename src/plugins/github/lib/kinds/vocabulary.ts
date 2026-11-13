/**
 * Which kind's words a call answers with.
 *
 * The one lookup table of the nine vocabularies, and the only file that knows
 * all nine exist. A read names its kind, the model's answer and the log's row
 * both go through here, and adding a kind means adding its file and its row —
 * nothing downstream branches on kind by hand.
 *
 * A `github-release` call answers as `release` when it names a tag and `releases`
 * when it does not, and both meet the same words: the list and the record are one
 * vocabulary read two ways.
 */

import type { GithubKind } from "../../types";
import { commitWords } from "./commit";
import { fileWords } from "./file";
import { issueWords } from "./issue";
import { prWords } from "./pr";
import { releaseWords } from "./release";
import { repoWords } from "./repo";
import { searchWords } from "./search";
import { treeWords } from "./tree";
import { userWords } from "./user";
import type { GithubKindWords } from "./contract";

const WORDS_OF_KIND: ReadonlyMap<GithubKind, GithubKindWords> = new Map([
  ["repo", repoWords],
  ["file", fileWords],
  ["tree", treeWords],
  ["pr", prWords],
  ["issue", issueWords],
  ["release", releaseWords],
  ["releases", releaseWords],
  ["commit", commitWords],
  ["search", searchWords],
  ["user", userWords],
]);

/** The words of a kind; a kind no read answers as speaks like a repository. */
export const wordsOf = (kind: GithubKind): GithubKindWords =>
  WORDS_OF_KIND.get(kind) ?? repoWords;
