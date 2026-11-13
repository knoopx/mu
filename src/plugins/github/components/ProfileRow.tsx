/**
 * `github-user`: a profile, in the order a profile is read.
 *
 * The face and the name the person chose open the card, with the handle in mono
 * under them; what they publish and who reads it follow as counts; and the words
 * they wrote about themselves close it.
 */

import type { JSX } from "react";

import { Band, Facts, Identity, Prose } from "./chrome";
import type { GithubToolView } from "../lib/toolView";

export function ProfileRow({ view }: { view: GithubToolView }): JSX.Element {
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
