/**
 * `github-commit`: one commit, read the way a pull request is.
 *
 * Who wrote it stands at the head of the card beside the subject, with the sha and
 * the repository in mono under them; when it was authored and how many files it
 * touched follow; then the files and what happened to each; then the message, which
 * is the only part of a commit that is prose.
 */

import type { JSX } from "react";

import { Band, Facts, Identity, Prose } from "./chrome";
import { Changeset } from "./Changeset";
import type { GithubToolView } from "../lib/toolView";

export function CommitRow({ view }: { view: GithubToolView }): JSX.Element {
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
