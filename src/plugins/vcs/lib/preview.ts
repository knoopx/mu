/**
 * What one file of a change is previewed as.
 *
 * The patch says what changed; the file says how that should be drawn. Source
 * draws as a diff of its lines, a table as the two tables lined up row by row,
 * a picture as the picture before and the picture after, and a file with no
 * lines to line up is only named. The decision is here so the panel draws what
 * it is told instead of guessing from the patch text.
 */
import {
  imageFormatOfExtension,
  isRasterFormatName,
  isTabularPath,
  parseTabularSides,
  type ImageFormat,
  type TabularSides,
} from "adwaita-gpuix";

export type PreviewKind = "none" | "diff" | "tabular" | "image" | "binary";

export interface FilePreview {
  kind: PreviewKind;

  /** the two sides of a table, when kind is "tabular" */
  tabular: TabularSides | null;
}

/** jj says a patch carries bytes rather than lines in its own header lines. */
const BINARY_HEADS = ["Binary files", "GIT binary patch", "binary patch"];

const MIME_OF: Record<ImageFormat, string> = {
  bmp: "image/bmp",
  gif: "image/gif",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  pnm: "image/x-portable-pixmap",
  png: "image/png",
  svg: "image/svg+xml",
  tiff: "image/tiff",
  unknown: "application/octet-stream",
  webp: "image/webp",
};

/** A file whose picture can be painted: what the renderer decodes, by name. */
export function isImageFile(path: string): boolean {
  return isRasterFormatName(path);
}

function imageMimeType(path: string): string {
  return MIME_OF[imageFormatOfExtension(path)];
}

export function imageDataUrl(bytes: Uint8Array, path: string): string {
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:${imageMimeType(path)};base64,${base64}`;
}

function patchCarriesBytes(patch: string): boolean {
  for (const line of patch.split("\n")) {
    if (BINARY_HEADS.some((head) => line.startsWith(head))) return true;
  }
  return false;
}

/**
 * The preview of one file of a change. A table is only read as a table when
 * the file is one by name: a source diff has commas too, and lining its
 * columns up would be a lie.
 */
export function filePreviewOf(path: string, patch: string): FilePreview {
  if (path.length === 0) return { kind: "none", tabular: null };
  if (isImageFile(path)) return { kind: "image", tabular: null };

  const tabular = isTabularPath(path) ? parseTabularSides(patch, path) : null;
  if (tabular !== null) return { kind: "tabular", tabular };

  if (patch.trim() === "") return { kind: "none", tabular: null };
  if (patchCarriesBytes(patch)) return { kind: "binary", tabular: null };
  return { kind: "diff", tabular: null };
}
