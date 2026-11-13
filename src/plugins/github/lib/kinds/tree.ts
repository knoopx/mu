/**
 * A folder listing.
 *
 * A folder is a tree, so it is drawn as one — `FileTree`, with its folders opening
 * under the cursor — and it carries no figures of its own: a name and a type are
 * the whole of what an entry is, and a count above the list would only repeat what
 * the list is. Sizes live in the model's table; the human's question here is what
 * is in the folder and which of it is a folder too.
 */

import { cells, identityOf } from "./contract";
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
  identity: (call) =>
    identityOf(
      call,
      call.path === "" ? `${call.repo} root` : call.path,
      "folder-open",
    ),
  // Nothing above the tree: a folder counted over the list of what is in it is that
  // list counted again.
  facts: () => [],
  state: () => null,
  body: "none",
};
