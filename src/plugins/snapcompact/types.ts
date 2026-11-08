import type { ContextEvent } from "@earendil-works/pi-coding-agent";
import type {
  Archive,
  CompactionDetails,
  Shape,
} from "@oh-my-pi/snapcompact";

import { ARCHIVE_KEY } from "./constants";

/** The frame archive, exactly as the package lays it out. mu stores it verbatim
 *  in a compaction entry's `details` and hands it back verbatim on replay, so it
 *  never re-shapes the archive it persisted. */
export type SnapcompactArchive = Archive;

/** The shape one pass drew with, in the words a transcript row can print. The
 *  package's `Shape` is a rendering recipe; this is what mu keeps beside the
 *  archive so a later read says how the pages were set without re-resolving it. */
export interface SnapcompactShape {
  readonly font: Shape["font"];
  /** Cell advance in px, one string: `"11x16"`. */
  readonly cell: string;
  readonly frameSize: number;
  readonly variant: Shape["variant"];
  /** Characters across one page, and text rows down it. */
  readonly cols: number;
  readonly rows: number;
}

/** A compaction entry's `details` when snapcompact wrote the entry.
 *
 *  pi keeps `details` as extension-specific data and never sends it to the
 *  model, which is what makes it the right home for frames: the base64 PNGs ride
 *  in the session file and are re-attached to the context on every rebuild by
 *  `lib/replay.ts`. The file lists sit alongside the archive under the same keys
 *  pi's own compactions use, so a session tree reads them the same way. */
export interface SnapcompactDetails extends CompactionDetails {
  readonly [ARCHIVE_KEY]: SnapcompactArchive;
  /** `provider/id` of the reader the frames were drawn for. */
  readonly reader: string;
  readonly shape: SnapcompactShape;
  /** Frames in the archive, characters it carries, characters dropped to fit. */
  readonly frames: number;
  readonly chars: number;
  readonly dropped: number;
}

/** mu's switch, read from the user's config file. */
export interface SnapcompactConfig {
  readonly enabled: boolean;
  readonly maxFrames: number;
  /** A shape variant name, or `null` for whichever shape the reader earns. */
  readonly shapeVariant: string | null;
}

/** What a pass did, in the figures a row prints. */
export interface SnapcompactPass {
  readonly reader: string;
  readonly shape: SnapcompactShape;
  readonly frames: number;
  readonly chars: number;
  readonly dropped: number;
}

/** The pi message union, read off the event a handler is allowed to rewrite. */
type ContextMessage = ContextEvent["messages"][number];

/** pi's custom message — the one shape that reaches the model as a user message
 *  whose blocks are whatever mu puts in it, text and images together. */
export type CustomContextMessage = Extract<ContextMessage, { role: "custom" }>;

/** One block of a replayed archive: a chunk of the transcript, or one page of it. */
type BlockOf<T> = T extends readonly (infer Block)[] ? Block : never;

export type ArchiveBlock = BlockOf<NonNullable<CustomContextMessage["content"]>>;
