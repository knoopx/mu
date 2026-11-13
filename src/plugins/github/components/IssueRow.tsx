/**
 * `github-issue`: an issue, in the order a conversation is read.
 *
 * Who opened it stands at the head of the card beside the title, with open or
 * closed on the far side of that line; when it was opened, what it is labelled with
 * and how many replies GitHub counts against it follow. Then what it was opened
 * with, and then the replies in the order they were written, each with the face of
 * whoever wrote it.
 */

import type { JSX } from "react";

import { Band, Facts, Identity, Prose } from "./chrome";
import { Thread } from "./Thread";
import type { GithubToolView } from "../lib/toolView";

export function IssueRow({ view }: { view: GithubToolView }): JSX.Element {
  return (
    <>
      <Band first>
        <Identity {...view.identity} state={view.state} />
        <Facts facts={view.facts} />
      </Band>
      <Band>
        <Prose source={view.body} />
      </Band>
      <Band>
        <Thread rows={view.rows} />
      </Band>
    </>
  );
}
