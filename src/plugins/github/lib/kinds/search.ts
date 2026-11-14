/**
 * A search, and what one hit of each of its five kinds is called.
 *
 * The kind searched for is the call's target, and it is also what decides how a
 * hit is drawn and what its row's columns are in the model's table: a repository
 * hit has a description, a language and a star count; a code hit has a path and a
 * repository it lives in; a user hit a login and a bio. That table is written here
 * once, read off `call.target`, because a row carries no mark of what kind of hit
 * it is and guessing at one from its shape is how a sha and a login start
 * answering in each other's columns.
 */

import { humanCount } from "../format";
import { cells, factsShown } from "./contract";
import type { GithubKindWords } from "./contract";
import type { GithubCall, GithubRow } from "../../types";

/** The part of a row each column is filled from — never `rank`, which `cells` numbers itself. */
type RowPart = "name" | "detail" | "state" | "figure";

/** The columns one search kind answers its hits in. */
const COLUMNS_OF_KIND: Readonly<
  Record<string, readonly (readonly [string, RowPart])[]>
> = {
  code: [
    ["path", "name"],
    ["repo", "detail"],
  ],
  issues: [
    ["title", "name"],
    ["state", "state"],
    ["where", "detail"],
    ["comments", "figure"],
  ],
  commits: [
    ["sha", "name"],
    ["message", "detail"],
    ["repo", "state"],
    ["author", "figure"],
  ],
  users: [
    ["login", "name"],
    ["bio", "detail"],
    ["type", "state"],
    ["counts", "figure"],
  ],
  repositories: [
    ["repo", "name"],
    ["description", "detail"],
    ["language", "state"],
    ["stars", "figure"],
  ],
};

const searchCells = (
  call: GithubCall,
  row: GithubRow,
): Record<string, string> => {
  const table = COLUMNS_OF_KIND[call.target] ?? COLUMNS_OF_KIND["repositories"];
  return cells(
    row,
    table.map(([column, part]) => [column, row[part]] as const),
  );
};

export const searchWords: GithubKindWords = {
  unit: "result",
  target: "kind",
  running: "searching GitHub",
  emptyShort: "no matches",
  emptyNote: (call) =>
    `no ${call.target} matches ${call.query === "" ? "(empty query)" : `“${call.query}”`}`,
  columns: searchCells,
  title: () => "",
  // A search is named by the words typed, and the kind of thing searched for is the
  // line under them.
  facts: () => factsShown([]),
  headerFacts: (call) =>
    call.total === 0 ? [] : [`${humanCount(String(call.total))} matched`],
  state: () => null,
  body: "none",
};
