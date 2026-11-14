/**
 * A repository: what it is, how many people say so, and what it is written in.
 *
 * A repository has no list of its own in this call — what it *is* is the answer —
 * so it draws no widget beyond its figures. Stars, forks, the language the code
 * is in, the licence, the branch a clone starts on, what is open, how big the
 * history is, when it last moved: each one a mark and a value, and nothing else.
 * Its description is GitHub's own prose, so it stands in the prose panel like any
 * other body.
 */

import { humanCount, humanDated } from "../format";
import {
  fact,
  factsShown,
  fieldNamed,
  identityOf,
  recordColumns,
  stateOf,
} from "./contract";
import type { GithubKindWords } from "./contract";

export const repoWords: GithubKindWords = {
  unit: "result",
  target: "",
  running: "reading the repository",
  emptyShort: "no repository",
  emptyNote: () => "no repository",
  columns: recordColumns,
  title: () => "",
  // A repository is named by the one name it has, and has no second line: the
  // account and the project are the name.
  // The repository is the record, so it is named once: there is no second line under
  // a name that is the same name.
  identity: (call) => ({ title: call.repo, secondary: "", icon: "code" }),
  // What people say about it (stars, forks, what is open), what it is (the language,
  // the licence), and when it last moved. A repository's `state` is a standing and
  // shows up only when it is news — archived — because “public” on a public
  // repository says nothing.
  // What a reader decides with: what it is written in, how many people say so, what
  // is still open, when it last moved. A licence and a default branch are the
  // repository's plumbing — a card that prints them is filling a row, not answering.
  facts: (call) =>
    factsShown([
      fact("language", fieldNamed(call, "language")),
      fact("stars", humanCount(fieldNamed(call, "stars")), { figure: true }),
      fact("forks", humanCount(fieldNamed(call, "forks")), { figure: true }),
      fact("open issues", humanCount(fieldNamed(call, "open issues")), {
        figure: true,
      }),
      fact("last push", humanDated(fieldNamed(call, "pushed"))),
    ]),
  state: (call) => stateOf(call),
  body: "prose",
};
