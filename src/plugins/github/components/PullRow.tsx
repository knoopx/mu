/**
 * `github-pr`: a pull request, in the order its reader asks for it.
 *
 * The person who opened it stands at the head of the card beside its title, with
 * where it stands — merged, open, draft — in the colour that word is read in on the
 * far side of the same line. Its counts follow: when it was opened, when it landed,
 * the two branches it joins, how many commits it brought. Then the change itself,
 * every file it touched with its own counts, and last what someone said about it,
 * because a description is commentary on the facts above it.
 */

import type { JSX } from "react";

import { Band, Facts, Identity } from "./chrome";
import { Changeset } from "./Changeset";
import { Prose } from "./chrome";
import type { GithubToolView } from "../lib/toolView";

export function PullRow({ view }: { view: GithubToolView }): JSX.Element {
  return (
    <>
      <Band first>
        <Identity {...view.identity} state={view.state} />
        <Facts facts={view.facts} />
      </Band>
      <Band>
        <Changeset rows={view.rows} />
      </Band>
      <Band>
        <Prose source={view.body} />
      </Band>
    </>
  );
}
