/**
 * One commit.
 *
 * Its rows are the files it moved, drawn as a changeset; its own words are the
 * subject line. The band carries who wrote it, when, and the scale of what it
 * moved — the file rows show which files, and a count of them would be the list
 * counted twice.
 */

import { humanDated, humanPerson } from "../format";
import { changesetColumns, fact, factsShown, fieldNamed } from "./contract";
import type { GithubKindWords } from "./contract";

export const commitWords: GithubKindWords = {
  unit: "file",
  target: "commit",
  running: "reading the commit",
  emptyShort: "no files changed",
  emptyNote: () => "no files changed",
  columns: changesetColumns,
  title: (call) => fieldNamed(call, "description"),
  facts: (call) =>
    factsShown([
      fact("authored by", humanPerson(fieldNamed(call, "author"))),
      fact("created", humanDated(fieldNamed(call, "date"))),
    ]),
  // How many files the commit moved is a count of the change rows the card draws, so
  // it rides the header rather than tallying the card from above.
  headerFacts: (call) => {
    const files = fieldNamed(call, "files");
    return files === "" ? [] : [`${files} ${files === "1" ? "file" : "files"}`];
  },
  state: () => null,
  body: "prose",
};
