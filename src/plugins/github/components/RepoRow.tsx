/**
 * `github-repo`: a repository card.
 *
 * The name it is known by opens the card, its counts — what it is written in, how
 * many people say so, what it may be used for, when it last moved — stand under it
 * as figures with the word for each underneath, and what its README says about
 * itself follows as prose. There is no tool box around it and no second line of
 * chips: the card is the record.
 */

import type { JSX } from "react";

import { Band, Facts, Identity, Prose } from "./chrome";
import type { GithubToolView } from "../lib/toolView";

export function RepoRow({ view }: { view: GithubToolView }): JSX.Element {
  return (
    <>
      <Band first>
        <Identity {...view.identity} state={view.state} />
        <Facts facts={view.facts} />
      </Band>
      <Band>
        <Prose source={view.body} />
      </Band>
    </>
  );
}
