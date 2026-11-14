/**
 * `github-issue`: an issue, in the order a conversation is read.
 *
 * The card is the conversation: the subject, what it was opened with, and the replies
 * in the order they were written. Everything that identifies the issue — its number
 * and repository, who opened it, when, what it is labelled with, how many replies
 * GitHub counts — is the header's line and its chips. Then what it was opened
 * with, and then the replies in the order they were written, each with the face of
 * whoever wrote it.
 */

import type { JSX } from "react";

import { Band, Prose } from "./chrome";
import { Thread } from "./Thread";
import type { GithubToolView } from "../lib/toolView";

export function IssueRow({ view }: { view: GithubToolView }): JSX.Element {
  return (
    <>
      <Band first>
        <Prose source={view.body} />
      </Band>
      <Band>
        <Thread rows={view.rows} />
      </Band>
    </>
  );
}
