import { ARCHIVE_MESSAGE_TYPE } from "../constants";
import type {
  ArchiveBlock,
  CustomContextMessage,
  SnapcompactDetails,
} from "../types";
import { archiveOf } from "./archive";
import type { Snapcompact } from "./load";
import {
  readerSeesImages,
  readerTakesThinking,
  replayBytesCeiling,
  type ReaderModel,
} from "./reader";

/**
 * What a replayed archive says about itself before the guide does.
 *
 * The package's summary is a reading guide and it ends at its own `HISTORY`
 * heading, so the archive lands directly under it. This line is mu's, and it is
 * the only thing telling the model that the guide, the text and the pages are one
 * archived history rather than a user turn.
 */
const ARCHIVE_LEAD =
  "Earlier conversation was archived rather than summarised: the guide below says how to read it, then the archive follows — the oldest and newest turns as text, the middle as pages of that same text printed small.\n\n";

/** One rebuilt history: the blocks to send, in reading order. */
export type SnapcompactReplay = readonly ArchiveBlock[];

/**
 * Rebuild an archive into message blocks for this reader.
 *
 * The frames are not stored in the context — pi rebuilds the context from the
 * session file on every request — so a snapcompacted session re-attaches them
 * here, each request, exactly as the package's own host re-attaches them from
 * `preserveData`. The byte ceiling is the reader's: the package halves whatever
 * that provider takes inline, and the frames past it come back as one omission
 * notice rather than as a request the provider refuses.
 *
 * A reader that has lost image input (the session moved to a text-only model
 * since the pass) gets the same history as text: the package's `viewWithoutFrames`
 * keeps the archive's own source, drops the middle past its ceiling, and rewrites
 * the guide so it stops pointing at pages this reader cannot see.
 */
export function replayArchive(
  snap: Snapcompact,
  details: SnapcompactDetails,
  summary: string,
  model: ReaderModel,
): SnapcompactReplay {
  const includeThinking = readerTakesThinking(snap, model);
  let guide = summary;
  let archive = archiveOf(details);
  if (!readerSeesImages(model)) {
    const textOnly = snap.viewWithoutFrames(summary, archive, {
      includeThinking,
    });
    guide = textOnly.summary;
    archive = textOnly.archive;
  }
  const blocks = snap.historyBlocks(archive, {
    maxFrameDataBytes: replayBytesCeiling(snap, model),
  });
  return [
    { type: "text", text: `${ARCHIVE_LEAD}${guide}` },
    ...(blocks as unknown as ArchiveBlock[]),
  ];
}

/** The message a replay is sent as.
 *
 *  pi turns a `custom` message into a user message carrying exactly the blocks it
 *  is given — text and images together, which no other message role in pi can
 *  mix. `display: false` because this message exists only for the model: it is
 *  never a session entry, so the transcript never sees it. */
export function archiveMessage(
  replay: SnapcompactReplay,
  timestamp: number,
): CustomContextMessage {
  return {
    role: "custom",
    customType: ARCHIVE_MESSAGE_TYPE,
    content: [...replay],
    display: false,
    timestamp,
  };
}
