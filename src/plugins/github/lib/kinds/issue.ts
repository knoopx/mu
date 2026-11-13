/**
 * An issue and its thread.
 *
 * An issue is a conversation, so it is drawn as one: the body first, then every
 * reply in the order it was written, each with the avatar of whoever wrote it. The
 * band under the title carries only what a thread cannot show by itself — where it
 * stands, how many replies GitHub counts against it (which is more than the ones
 * this call fetched, and says so), and the labels someone stuck on it.
 */

import { humanDate, humanDated, humanPerson, humanTally } from "../format";
import { cells, fact, factsShown, fieldNamed, stateOf } from "./contract";
import type { GithubKindWords } from "./contract";

export const issueWords: GithubKindWords = {
  unit: "comment",
  target: "issue",
  running: "reading the issue",
  emptyShort: "no comments",
  emptyNote: () => "no comments",
  columns: (_call, row) =>
    cells(row, [
      ["author", row.name],
      ["wrote", row.detail],
      ["at", row.figure],
    ]),
  title: (call) => fieldNamed(call, "title"),
  identity: (call) => ({
    title: fieldNamed(call, "title"),
    secondary: `${call.target} in ${call.repo}`,
    icon: "forum",
    person: humanPerson(fieldNamed(call, "author")),
  }),
  // When it was opened, what it is labelled with, and how many replies GitHub
  // counts against it — which is usually more than this call fetched, and that gap
  // is the news the thread below cannot show by itself.
  facts: (call) =>
    factsShown([
      fact("opened by", humanPerson(fieldNamed(call, "author"))),
      fact("created", humanDated(fieldNamed(call, "created"))),
      fact("labels", fieldNamed(call, "labels")),
      fact("replies", fieldNamed(call, "comments"), { figure: true }),
      fact("closed", humanDate(fieldNamed(call, "closed"))),
    ]),
  state: (call) => stateOf(call),
  body: "prose",
};
