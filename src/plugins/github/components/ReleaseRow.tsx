/**
 * `github-release`: one release's notes, or the track of them.
 *
 * One tag asks for one release, and that is a card: its name with the tag and the
 * repository under it, when it went out and what hangs off it, and the notes. No tag
 * asks what a project has published, and that is a history — one timeline down the
 * page, newest standing as the current point, each date read as a date.
 */

import type { JSX } from "react";

import { Band, Facts, Identity, Prose } from "./chrome";
import { ReleaseTrack } from "./ReleaseTrack";
import type { GithubToolView } from "../lib/toolView";

export function ReleaseRow({ view }: { view: GithubToolView }): JSX.Element {
  if (view.call.kind !== "release")
    return (
      <>
        <Band first>
          <Identity {...view.identity} state={view.state} />
        </Band>
        <Band>
          <ReleaseTrack rows={view.rows} />
        </Band>
      </>
    );

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
