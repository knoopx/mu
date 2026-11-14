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
  // Where the repository stands used to sit at the far end of the identity line
  // that repeated the header's own name; the word itself is news, so it rides the
  // header instead. A repository standing normally is not standing news.
  headerFacts: (call) => {
    const standing = stateOf(call);
    return standing === null || standing.tone === "plain"
      ? []
      : [standing.word];
  },
  state: (call) => stateOf(call),
  body: "prose",
};
