/**
 * `github-tree`: a folder, as the tree it is.
 *
 * One header. The folder and the repository it was listed out of are already what
 * the header says, so a title above the body repeating them is a second header on
 * one row; the body is the listing itself, every entry wearing the mark of what it
 * is and standing at the one depth the endpoint answered it at. A folder is one
 * section, so it stands on one card — the log's own plate.
 */

import type { JSX } from "react";

import { Band } from "./chrome";
import { FolderTree } from "./FolderTree";
import type { GithubToolView } from "../lib/toolView";

export function TreeRow({ view }: { view: GithubToolView }): JSX.Element {
  return (
    <Band first>
      <FolderTree rows={view.rows} />
    </Band>
  );
}
