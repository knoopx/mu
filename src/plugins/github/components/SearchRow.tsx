/**
 * `github-search`: the words typed, then what they found.
 *
 * The query opens the card with the kind of thing searched for under it, and how
 * many matched GitHub's answer beside that — the one thing the list below cannot
 * show itself. Every hit is then a row of its own kind, wearing the mark of what it
 * is: a repository, a file, a person, a sha.
 */

import type { JSX } from "react";

import { Band, Facts, Identity } from "./chrome";
import { Hits } from "./Hits";
import type { GithubToolView } from "../lib/toolView";

export function SearchRow({ view }: { view: GithubToolView }): JSX.Element {
  return (
    <>
      <Band first>
        <Identity {...view.identity} state={view.state} />
        <Facts facts={view.facts} />
      </Band>
      <Band>
        <Hits call={view.call} />
      </Band>
    </>
  );
}
