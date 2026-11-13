/**
 * A profile: a person or an organisation, with no repository around it.
 *
 * A profile is a face and a handful of counts, so it is drawn as one: the avatar
 * GitHub would show, the display name, and the figures of what the account
 * publishes and who reads it. Its bio is prose the account wrote about itself, so
 * it stands in the prose panel like any other body rather than in a label.
 */

import { humanCount, humanDate } from "../format";
import { cells, fact, factsShown, fieldNamed } from "./contract";
import type { GithubKindWords } from "./contract";

export const userWords: GithubKindWords = {
  unit: "result",
  target: "login",
  running: "reading the profile",
  emptyShort: "no profile",
  emptyNote: () => "no profile",
  columns: (_call, row) =>
    cells(row, [
      ["name", row.name],
      ["detail", row.detail],
      ["state", row.state],
      ["figure", row.figure],
    ]),
  title: (call) => fieldNamed(call, "name") || fieldNamed(call, "login"),
  // A profile is named by the name the person chose; the handle is the line under it.
  identity: (call) => {
    const named = fieldNamed(call, "name") || call.target;
    return {
      title: named,
      secondary: call.target,
      icon: "person",
      person: named,
    };
  },
  facts: (call) =>
    factsShown([
      // A person is the ordinary case, so it is not said; an organisation is news.
      fact(
        "account",
        fieldNamed(call, "type").toLowerCase() === "user"
          ? ""
          : fieldNamed(call, "type").toLowerCase(),
      ),
      fact("company", fieldNamed(call, "company")),
      fact("location", fieldNamed(call, "location")),
      fact("repositories", humanCount(fieldNamed(call, "repos")), {
        figure: true,
      }),
      fact("followers", humanCount(fieldNamed(call, "followers")), {
        figure: true,
      }),
      fact("following", humanCount(fieldNamed(call, "following")), {
        figure: true,
      }),
    ]),
  state: () => null,
  body: "prose",
};
