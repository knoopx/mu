/**
 * `github-repo`: a repository card.
 *
 * One header: the repository's name is already what the header says, and a title
 * above the body repeating it is a second header on one row. So the body opens with
 * the record's counts — what it is written in, how many people say so, what it may
 * be used for, when it last moved — as figures with the word for each underneath,
 * and what its README says about itself follows as prose. No box around any of it:
 * the plate is the band, and where the repository stands (archived, disabled) rides
 * the header beside its name.
 */

import type { JSX } from "react";

import { Band, Prose } from "./chrome";
import type { GithubToolView } from "../lib/toolView";

export function RepoRow({ view }: { view: GithubToolView }): JSX.Element {
  return (
    <Band first>
      <Prose source={view.body} />
    </Band>
  );
}
