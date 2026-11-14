/**
 * `github-file`: a file, read.
 *
 * One header and the text under it. The tool header already names the path and the
 * repository the file was read out of, and it trails the file's length and the line
 * this body stops at, so the body is the file's text and nothing else — no repeated
 * path, no two figures stacked above the thing they measure, no tally at the foot of
 * the panel: the file has one section, so it has one card, and that card is the
 * log's own plate. A file with no text to show draws no plate at all.
 */

import type { JSX } from "react";

import { Band, Code } from "./chrome";
import { fileBodyLines } from "../lib/format";
import type { GithubToolView } from "../lib/toolView";

export function FileRow({
  view,
}: {
  view: GithubToolView;
}): JSX.Element | null {
  const lines = fileBodyLines(view.body);
  if (lines.length === 0) return null;
  return (
    <Band first>
      <Code path={view.call.path} lines={lines} />
    </Band>
  );
}
