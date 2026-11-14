/**
 * `github-search`: how many matched, then what they were.
 *
 * The words typed and the kind of record wanted are the tool header's line, so the
 * card does not write them again: it opens on how many matched GitHub's answer, the
 * one figure the list below cannot show itself, and every hit is then a row of its
 * own kind, wearing the mark of what it is — a repository, a file, a person, a sha.
 */

import type { JSX } from "react";

import { Band } from "./chrome";
import { Hits } from "./Hits";
import type { GithubToolView } from "../lib/toolView";

export function SearchRow({ view }: { view: GithubToolView }): JSX.Element {
  return (
    <>
      <Band first>
        <Hits call={view.call} />
      </Band>
    </>
  );
}
