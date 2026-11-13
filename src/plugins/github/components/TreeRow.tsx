/**
 * `github-tree`: a folder, as the tree it is.
 *
 * The folder opens the card with the repository under it and how many entries it
 * holds beside that; everything else is the tree itself, every entry wearing the
 * mark of what it is and able to open.
 */

import type { JSX } from "react";

import { Band, Facts, Identity } from "./chrome";
import { FolderTree } from "./FolderTree";
import type { GithubToolView } from "../lib/toolView";

export function TreeRow({ view }: { view: GithubToolView }): JSX.Element {
  return (
    <>
      <Band first>
        <Identity {...view.identity} state={view.state} />
        <Facts facts={view.facts} />
      </Band>
      <Band>
        <FolderTree rows={view.rows} />
      </Band>
    </>
  );
}
