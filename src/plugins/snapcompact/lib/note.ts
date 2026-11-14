/** The transcript's words for one snapcompact pass, and for its absence. */

import type { SnapcompactDetails, SnapcompactPass } from "../types";

const thousands = (value: number): string => value.toLocaleString();

/** The pages an archive is made of, in the one line a row prints. */
export function passNote(pass: SnapcompactPass): string {
  const dropped =
    pass.dropped > 0 ? `, ${thousands(pass.dropped)} chars dropped` : "";
  // A short history needs no pages at all: the layout keeps the whole thing as
  // text between the two text edges, and saying "0 pages" would read as a failure.
  if (pass.frames === 0)
    return `Context compacted · history archived as text (${thousands(pass.chars)} chars${dropped})`;
  const pages =
    pass.frames === 1 ? "1 bitmap page" : `${pass.frames} bitmap pages`;
  const setting = `${pass.shape.font} ${pass.shape.cell} · ${pass.shape.cols}×${pass.shape.rows}`;
  return `Context compacted · ${pages} of archived history (${thousands(pass.chars)} chars, ${setting}${dropped})`;
}

/** The same line, read back off a session entry, where a resumed session's rows
 *  come from the file rather than from the pass that wrote it. */
export const detailsNote = (details: SnapcompactDetails): string =>
  passNote({
    reader: details.reader,
    shape: details.shape,
    frames: details.frames,
    chars: details.chars,
    dropped: details.dropped,
  });
