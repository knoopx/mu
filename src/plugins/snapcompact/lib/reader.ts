import type { Geometry, Shape } from "@oh-my-pi/snapcompact";

import type { Snapcompact } from "./load";
import type { SnapcompactShape } from "../types";

/**
 * The reading model, in the few fields this plugin asks about.
 *
 * `@oh-my-pi/snapcompact` was written for oh-my-pi's own model record, and mu's
 * model comes from pi's registry — two forks, one shape. The package only ever
 * reads `provider`, `api`, `id`, `baseUrl`, `reasoning` and the image-count and
 * input-modality axes off it, so mu passes exactly those and nothing else, and
 * the cast at the call sites below is the one place the two forks meet.
 */
export interface ReaderModel {
  readonly api: string;
  readonly id: string;
  readonly provider: string;
  readonly baseUrl?: string;
  readonly reasoning?: boolean;
  readonly input?: readonly string[];
}

/** The package's own model records, read back off its exported functions so mu
 *  never names the other fork's package to cast against it. */
type PackageModel = Parameters<Snapcompact["readerIncludesThinking"]>[0];
type PackageShapeTarget = NonNullable<Parameters<Snapcompact["resolveShape"]>[0]>;

const asPackageModel = (model: ReaderModel): PackageModel =>
  model as unknown as PackageModel;

const asShapeTarget = (model: ReaderModel): PackageShapeTarget =>
  model as unknown as PackageShapeTarget;

export const readerLabel = (model: ReaderModel): string =>
  `${model.provider}/${model.id}`;

/** Whether this reader takes images at all — the whole gate on a bitmap pass.
 *  A text-only reader gets pi's summarizer instead, whose output it can read. */
export const readerSeesImages = (model: ReaderModel): boolean =>
  model.input?.includes("image") === true;

/** Whether the archive may replay assistant reasoning as text. The package knows
 *  which readers refuse reasoning quoted back into their own input; mu asks it
 *  rather than keeping a provider list of its own. */
export function readerTakesThinking(
  snap: Snapcompact,
  model: ReaderModel,
): boolean {
  return snap.readerIncludesThinking(asPackageModel(model));
}

/** The frame shape this reader earns, or the one the config forces. */
export function readerShape(
  snap: Snapcompact,
  model: ReaderModel,
  variant: string | null,
): Shape {
  const wanted =
    variant !== null && snap.isShapeVariantName(variant) ? variant : "auto";
  return snap.resolveShape(asShapeTarget(model), wanted);
}

/** How many frames a pass may plan: mu's ceiling, and never past what this
 *  reader's provider will carry in one request. */
export function frameCeiling(
  snap: Snapcompact,
  model: ReaderModel,
  maxFrames: number,
): number {
  return Math.max(1, Math.min(maxFrames, snap.providerFrameBudget(asPackageModel(model))));
}

/** How much frame payload one rebuilt context may carry, in base64 bytes. The
 *  package reads this off the reader (its inline image budget, halved), so mu
 *  never invents a second byte number beside pi's own resize limit. */
export const replayBytesCeiling = (
  snap: Snapcompact,
  model: ReaderModel,
): number => snap.frameDataBytesBudget(asPackageModel(model));

/** The page geometry a shape prints, for the label a row keeps beside an archive. */
export const shapeGeometry = (
  snap: Snapcompact,
  shape: Shape,
): Geometry => snap.geometry(shape);

/** One shape, in words. The archive's own frames win where they disagree with
 *  the shape mu resolved (the package swaps the font when a text cannot be drawn
 *  in it), so a row never claims a font no page was set in. */
export function shapeLabel(
  shape: Shape,
  geometry: Geometry,
  frames: readonly { font?: Shape["font"]; cols: number; rows: number }[],
): SnapcompactShape {
  const first = frames[0];
  return {
    font: first?.font ?? shape.font,
    cell: `${shape.cellWidth}x${shape.cellHeight}`,
    frameSize: shape.frameSize,
    variant: shape.variant,
    cols: first?.cols ?? geometry.cols,
    rows: first?.rows ?? geometry.rows,
  };
}
