/**
 * A picture opened over the whole window.
 *
 * Its own conversation: a photo the log can only show as a tile, the agent
 * reading the file and saying what is really in frame, and the picture then put
 * up at the size the window gives it — which is what the reader clicked the tile
 * for. The row's own figures (the kind, the size) come from the same helpers the
 * read row prints them with, so the viewer's caption is the code's answer and
 * not a drawing of one.
 */
import { formatSize } from "@earendil-works/pi-coding-agent";

import { mediaKind } from "../../../src/plugins/core/lib/ui/media";
import type { ViewerPicture } from "../../../src/plugins/core/lib/ui/imageViewer";
import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { photoFile, photoOf } from "../media";
import { answer, ran, usage, userTurn } from "../turn";

const MEADOW = photoOf("meadow");
const MEADOW_FILE = photoFile("meadow");

const FRAME_ANSWER = [
  "The fence post is in frame — hard right, and the sun is behind it, so it reads",
  "as a dark edge rather than a post. What the tile loses is the bottom third:",
  "the flare sits low centre and the dry grass in front of it is where the",
  "picture's weight is.",
  "",
  "So the crop is not wrong, the thumbnail is. The keeper is wider than the tile",
  "and the part that matters is the part it cuts.",
].join("\n");

const FRAME_REASONING = [
  "The user says the tile looks cropped. Read the file rather than judging the",
  "thumbnail: the tile is a fixed box, so a wide picture loses its edges there",
  "and nothing about the file changed.",
].join("\n");

export const PICTURE_VIEW_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-frame",
    "that meadow shot looks cropped in the log but i don't trust the thumbnail. read the file and tell me whether the fence post is in frame, then show me the thing at a size i can actually judge",
    0,
  ),
  ran(
    "c-read-meadow",
    "read",
    { path: MEADOW.path },
    "Read image file [image/jpeg]",
    6_000,
    { image: MEADOW_FILE },
  ),
  {
    ...answer("a-frame", FRAME_ANSWER, { reasoning: FRAME_REASONING }),
    usage: usage(11_400, 1_980, 0, 1, 2),
  },
];

/** The tile the reader clicked over: the read row's own picture, named by the
 *  file it came from and sized by the same figures the row prints. */
export const PICTURE_VIEW_SHOWN: ViewerPicture = {
  src: MEADOW_FILE.src,
  title: MEADOW.path,
  detail: `${mediaKind(MEADOW_FILE.mimeType)} · ${formatSize(MEADOW_FILE.bytes)}`,
};
