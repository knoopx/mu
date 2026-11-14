/**
 * `github-release`: one release's notes, or the track of them.
 *
 * One tag asks for one release, and that is a card: its name and its notes. When it
 * went out, who published it and what hangs off it are counts, and with the tag and
 * the repository they ride the header and its chips. No tag
 * asks what a project has published, and that is a history — one timeline down the
 * page, newest standing as the current point, each date read as a date.
 */

import type { JSX } from "react";

import { Band, Prose } from "./chrome";
import { ReleaseTrack } from "./ReleaseTrack";
import type { GithubToolView } from "../lib/toolView";

export function ReleaseRow({ view }: { view: GithubToolView }): JSX.Element {
  if (view.call.kind !== "release")
    return (
      <Band first>
        <ReleaseTrack rows={view.rows} />
      </Band>
    );

  return (
    <>
      <Band first>
        <Prose source={view.body} />
      </Band>
    </>
  );
}
