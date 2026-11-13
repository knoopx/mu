/**
 * Releases: the recent ones, or the one a tag names.
 *
 * A list of releases is a track of dates down the page — what a project shipped
 * and when — and one release is its notes, which is prose a person wrote. The two
 * share this file because the reader meets them the same way; the difference is
 * that a single release has figures of its own (what went out, who published it,
 * how many files hang off it) and a list has none, because its rows are the
 * answer.
 */

import { humanDate, humanDated, humanPerson } from "../format";
import { cells, fact, factsShown, fieldNamed, stateOf } from "./contract";
import type { GithubKindWords } from "./contract";

/** One release read by its tag; a list of them read from the repository. */
const isSingle = (kind: string): boolean => kind === "release";

export const releaseWords: GithubKindWords = {
  unit: "release",
  target: "tag",
  running: "reading the releases",
  emptyShort: "no releases",
  emptyNote: (call) => `${call.repo} publishes no releases`,
  columns: (_call, row) =>
    cells(row, [
      ["name", row.name],
      ["tag", row.detail],
      ["state", row.state],
      ["published", row.figure],
    ]),
  title: (call) =>
    isSingle(call.kind)
      ? fieldNamed(call, "name") || fieldNamed(call, "tag")
      : "",
  identity: (call) =>
    isSingle(call.kind)
      ? {
          title: fieldNamed(call, "name") || call.target,
          secondary: `${call.target} in ${call.repo}`,
          icon: "sell",
          person: humanPerson(fieldNamed(call, "author")),
        }
      : { title: `Releases of ${call.repo}`, secondary: "", icon: "sell" },
  facts: (call) =>
    isSingle(call.kind)
      ? factsShown([
          fact("published", humanDated(fieldNamed(call, "published"))),
          fact("author", humanPerson(fieldNamed(call, "author"))),
          fact("assets", fieldNamed(call, "assets"), { figure: true }),
        ])
      : [],
  // A release that is simply released is not standing anywhere noteworthy; a
  // prerelease or a draft is, and that is said once, on the title's own line.
  state: (call) => {
    if (!isSingle(call.kind)) return null;
    const standing = stateOf(call);
    return standing === null || standing.word === "released" ? null : standing;
  },
  body: "prose",
};
