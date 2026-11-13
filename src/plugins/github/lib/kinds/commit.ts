/**
 * One commit.
 *
 * Its rows are the files it moved, drawn as a changeset; its own words are the
 * subject line. The band carries who wrote it, when, and the scale of what it
 * moved — the file rows show which files, and a count of them would be the list
 * counted twice.
 */

import { humanDated, humanPerson } from "../format";
import { cells, fact, factsShown, fieldNamed } from "./contract";
import type { GithubKindWords } from "./contract";

export const commitWords: GithubKindWords = {
  unit: "file",
  target: "commit",
  running: "reading the commit",
  emptyShort: "no files changed",
  emptyNote: () => "no files changed",
  columns: (_call, row) =>
    cells(row, [
      ["file", row.name],
      ["status", row.state],
      ["changes", row.figure],
      ["was", row.detail],
    ]),
  title: (call) => fieldNamed(call, "description"),
  identity: (call) => ({
    title: fieldNamed(call, "description"),
    secondary: `${call.target} in ${call.repo}`,
    icon: "commit",
    person: humanPerson(fieldNamed(call, "author")),
  }),
  // Who wrote it and when, and how many files it touched: the rows below say what
  // happened to each of them, and the scale beside this band says how much moved in
  // total, so neither is repeated here.
  facts: (call) =>
    factsShown([
      fact("authored by", humanPerson(fieldNamed(call, "author"))),
      fact("created", humanDated(fieldNamed(call, "date"))),
      fact("files", fieldNamed(call, "files"), { figure: true }),
    ]),
  state: () => null,
  body: "prose",
};
