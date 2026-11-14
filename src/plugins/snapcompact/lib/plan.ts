import {
  convertToLlm,
  type SessionBeforeCompactEvent,
} from "@earendil-works/pi-coding-agent";

import { ARCHIVE_KEY } from "../constants";
import type {
  SnapcompactArchive,
  SnapcompactConfig,
  SnapcompactDetails,
  SnapcompactPass,
} from "../types";
import type { Snapcompact } from "./load";
import {
  frameCeiling,
  readerLabel,
  readerShape,
  readerTakesThinking,
  shapeGeometry,
  shapeLabel,
  type ReaderModel,
} from "./reader";

type PiPreparation = SessionBeforeCompactEvent["preparation"];

/** The package's own parameter shapes, read back off its exported `compact` so
 *  mu never names the other fork's message types to cast against them. */
type PackagePreparation = Parameters<Snapcompact["compact"]>[0];
type PackageOptions = NonNullable<Parameters<Snapcompact["compact"]>[1]>;

/** One pass, in the shape mu hands pi's `session_before_compact` handler. */
export interface SnapcompactPlan {
  readonly summary: string;
  readonly firstKeptEntryId: string;
  readonly tokensBefore: number;
  readonly details: SnapcompactDetails;
  /** What happened, for the row the transcript prints. */
  readonly pass: SnapcompactPass;
}

export interface SnapcompactPlanOptions {
  readonly model: ReaderModel;
  readonly config: SnapcompactConfig;
  /** The archive of the previous snapcompact pass on this branch, if any. */
  readonly previous?: SnapcompactDetails;
}

/**
 * Archive the discarded turns as bitmap pages instead of summarising them.
 *
 * Fully local: no model call, no API key, nothing billed. The package serializes
 * the span pi is about to discard, folds it into the archive the previous pass
 * left, and renders the whole thing into an ordered history — text at the oldest
 * edge, pages of that same text printed small in the middle, text at the newest
 * edge. What comes back is a short reading guide, the file lists, and the frames.
 *
 * mu's job here is three things the package does not know: pi's `convertToLlm`
 * (so the messages are read the way pi reads them), the cumulative file lists pi
 * declines to carry across an extension's own compactions, and the previous
 * archive, which lives in a compaction entry's `details` for mu and in
 * `preserveData` for the package's own host.
 */
export async function planSnapcompact(
  snap: Snapcompact,
  preparation: PiPreparation,
  options: SnapcompactPlanOptions,
): Promise<SnapcompactPlan | undefined> {
  const { model, config, previous } = options;
  const shape = readerShape(snap, model, config.shapeVariant);
  const geometry = shapeGeometry(snap, shape);

  const fileOps = {
    read: new Set(preparation.fileOps.read),
    written: new Set(preparation.fileOps.written),
    edited: new Set(preparation.fileOps.edited),
  };
  if (previous !== undefined) {
    for (const path of previous.readFiles) fileOps.read.add(path);
    for (const path of previous.modifiedFiles) fileOps.edited.add(path);
  }

  const result = await snap.compact(
    {
      firstKeptEntryId: preparation.firstKeptEntryId,
      messagesToSummarize: preparation.messagesToSummarize,
      turnPrefixMessages: preparation.turnPrefixMessages,
      tokensBefore: preparation.tokensBefore,
      previousSummary: preparation.previousSummary,
      ...(previous === undefined
        ? {}
        : { previousPreserveData: { [ARCHIVE_KEY]: previous[ARCHIVE_KEY] } }),
      fileOps,
    } as unknown as PackagePreparation,
    {
      model,
      ...(config.shapeVariant !== null &&
      snap.isShapeVariantName(config.shapeVariant)
        ? { shape }
        : {}),
      maxFrames: frameCeiling(snap, model, config.maxFrames),
      convertToLlm,
      includeThinking: readerTakesThinking(snap, model),
    } as PackageOptions,
  );

  const archive = result.preserveData?.[ARCHIVE_KEY] as
    SnapcompactArchive | undefined;
  if (archive === undefined) return undefined;

  const frames = archive.frames;
  const reader = readerLabel(model);
  const pass: SnapcompactPass = {
    reader,
    shape: shapeLabel(shape, geometry, frames),
    frames: frames.length,
    chars: archive.totalChars,
    dropped: archive.truncatedChars,
  };
  return {
    summary: result.summary,
    firstKeptEntryId: result.firstKeptEntryId,
    tokensBefore: result.tokensBefore,
    pass,
    details: {
      readFiles: result.details?.readFiles ?? [],
      modifiedFiles: result.details?.modifiedFiles ?? [],
      [ARCHIVE_KEY]: archive,
      reader,
      shape: pass.shape,
      frames: pass.frames,
      chars: pass.chars,
      dropped: pass.dropped,
    },
  };
}
