/**
 * `github-user`: a profile, in the order a profile is read.
 *
 * The card is the person: the face and the name they chose, and the words they wrote
 * about themselves. What they publish and who reads it are counts, and counts — along
 * with the handle the call was pointed at — ride the header and its chips.
 */

import type { JSX } from "react";

import { Band, Prose } from "./chrome";
import type { GithubToolView } from "../lib/toolView";

export function ProfileRow({ view }: { view: GithubToolView }): JSX.Element {
  return (
    <>
      <Band first>
        <Prose source={view.body} />
      </Band>
    </>
  );
}
