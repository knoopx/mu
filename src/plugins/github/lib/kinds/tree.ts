/**
 * A folder listing.
 *
 * A folder is drawn as the one level the endpoint answered — `FileTree`, every
 * entry at the depth GitHub named it, a folder wearing its mark but opened by
 * nothing, because this answer carries no contents for it. A name and a type are
 * the whole of what an entry is, and a count above the list would only repeat what
 * the list is. Sizes live in the model's table; the human's question here is what
 * is in the folder and which of it is a folder too.
 */

import { cells } from "./contract";
import type { GithubKindWords } from "./contract";

export const treeWords: GithubKindWords = {
  unit: "entry",
  target: "",
  running: "listing the folder",
  emptyShort: "the folder is empty",
  emptyNote: (call) =>
    `${call.path === "" ? call.repo : call.path} has no entries`,
  columns: (_call, row) =>
    cells(row, [
      ["name", row.name],
      ["type", row.state],
      ["size", row.figure],
      ["path", row.detail],
    ]),
  title: () => "",
  facts: () => [],
  // The tree's rows are the whole answer and the header names the folder; a folder
  // counted twice would be the list counted again.
  headerFacts: () => [],
  state: () => null,
  body: "none",
};
