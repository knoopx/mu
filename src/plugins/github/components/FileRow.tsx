/**
 * `github-file`: a file, read.
 *
 * The path opens the card with the repository under it, its size and length follow
 * as two figures, and the text is the body of the card — highlighted by the same
 * tree-sitter pass the diff rows use. Where the panel stops short one quiet line
 * says how much of the file is on screen; the answer's own character budget stays
 * in the model's table, because a cut is said once, where it shows.
 */

import type { JSX } from "react";

import { Band, Code, Facts, Identity } from "./chrome";
import { numberOf } from "../lib/api/record";
import { fieldNamed } from "../lib/kinds/contract";
import type { GithubToolView } from "../lib/toolView";

export function FileRow({ view }: { view: GithubToolView }): JSX.Element {
  const total = numberOf(fieldNamed(view.call, "lines"));

  return (
    <>
      <Band first>
        <Identity {...view.identity} state={view.state} />
        <Facts facts={view.facts} />
      </Band>
      <Band>
        <Code path={view.call.path} content={view.body} total={total} />
      </Band>
    </>
  );
}
