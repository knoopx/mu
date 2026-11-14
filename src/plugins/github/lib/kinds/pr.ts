/**
 * A pull request.
 *
 * One number, two branches and a verdict. What a request *is* is its title, and
 * what it *does* is the changeset below it — so the band under the title carries
 * only what the changeset cannot say: where it stands, which branch it comes from
 * and goes to, and how many commits it brings. The lines it moves are said by the
 * change histogram and the file rows, not here.
 */

import { humanBranch, humanDated, humanPerson, humanTally } from "../format";
import {
  changesetColumns,
  fact,
  factsShown,
  fieldNamed,
  stateOf,
} from "./contract";
import type { GithubKindWords } from "./contract";

export const prWords: GithubKindWords = {
  unit: "file",
  target: "pr",
  running: "reading the pull request",
  emptyShort: "no pull request",
  emptyNote: () => "no pull request",
  columns: changesetColumns,
  title: (call) => fieldNamed(call, "title"),
  identity: (call) => ({
    title: fieldNamed(call, "title"),
    secondary: `${call.target} in ${call.repo}`,
    icon: "merge",
    person: humanPerson(fieldNamed(call, "author")),
  }),
  // Who opened it and when, when it landed, and what it brought. The branches are
  // one fact, not two, so they read as the join they are; the lines it moves belong
  // to the changeset below, which shows them per file.
  facts: (call) => {
    const head = humanBranch(fieldNamed(call, "head"));
    const base = humanBranch(fieldNamed(call, "base"));
    return factsShown([
      fact("opened by", humanPerson(fieldNamed(call, "author"))),
      fact("created", humanDated(fieldNamed(call, "created"))),
      fact("merged", humanDated(fieldNamed(call, "merged"))),
      fact("branches", head === "" || base === "" ? "" : `${head} → ${base}`),
      fact("commits", fieldNamed(call, "commits"), { figure: true }),
    ]);
  },
  state: (call) => stateOf(call),
  body: "prose",
};
