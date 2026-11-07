export const GREP_OBJECT_FIT = [
  "src/plugins/core/components/composer/attachments.tsx:86: export const ATTACHMENT_THUMB = 48;",
  'src/plugins/core/components/composer/attachments.tsx:175: objectFit="cover"',
  'src/plugins/core/components/composer/attachments.tsx:214: objectFit="cover"',
  'src/plugins/core/components/composer/Composer.tsx:779: objectFit="contain"',
  'src/plugins/core/components/ReadPreview.tsx:208: objectFit="contain"',
].join("\n");

export const READ_THUMB_STYLES = [
  "export const ATTACHMENT_THUMB = 48;",
  "",
  "const THUMB_BORDER = 1;",
  "",
  "function thumbBox(t: AdwaitaTheme, size: number): StyleDesc {",
  "  return {",
  '    position: "relative",',
  "    width: size,",
  "    height: size,",
  "    flexShrink: 0,",
  "    borderRadius: t.radius.sm,",
  "    borderWidth: THUMB_BORDER,",
  "    backgroundColor: t.color.surface.raised,",
  '    overflow: "hidden",',
  "  };",
  "}",
  "",
  "function thumbImage(size: number): StyleDesc {",
  "  const inner = size - 2 * THUMB_BORDER;",
  "  return {",
  "    width: inner,",
  "    height: inner,",
  "    borderRadius: 0,",
  "  };",
  "}",
].join("\n");

export const READ_THUMB_STRIP = [
  "export function AttachmentThumbs(props: AttachmentThumbsProps): JSX.Element | null {",
  "  const t = useAdwaita();",
  "  const size = props.size ?? ATTACHMENT_THUMB;",
  "  const images = props.images.filter((image) =>",
  "    isRenderableImage(image.src, image.mimeType),",
  "  );",
  "  if (images.length === 0) return null;",
  "  return (",
  "    <div style={thumbStrip(t, { paddingTop: t.space.sm })}>",
  "      {images.map((image, i) => (",
  "        <div key={`${image.src.slice(0, 40)}-${i}`} style={thumbBox(t, size)}>",
  "          <img",
  "            src={image.src}",
  "            alt={image.mimeType}",
  '            objectFit="cover"',
  "            style={thumbImage(size)}",
  "          />",
  "        </div>",
  "      ))}",
  "    </div>",
  "  );",
  "}",
].join("\n");

export const LS_PICTURES = [
  "total 148",
  "-rw-r--r-- 1 knoopx users 36688 oct  18 19:41 chicago-river.jpg",
  "-rw-r--r-- 1 knoopx users 40638 oct  22 08:05 sf-bay-portrait.jpg",
  "-rw-r--r-- 1 knoopx users 18335 oct  25 23:12 star-trails.jpg",
  "-rw-r--r-- 1 knoopx users 27322 oct  26 07:58 sunlit-meadow.jpg",
  "-rw-r--r-- 1 knoopx users 18784 nov   2 12:33 underwater-swimmer.jpg",
].join("\n");

export const IDENTIFY_PICTURES = [
  "sunlit-meadow.jpg JPEG 640x360 640x360+0+0 8-bit sRGB 27322B",
  "underwater-swimmer.jpg JPEG 640x360 640x360+0+0 8-bit sRGB 18784B",
  "chicago-river.jpg JPEG 640x360 640x360+0+0 8-bit sRGB 36688B",
  "star-trails.jpg JPEG 640x360 640x360+0+0 8-bit sRGB 18335B",
  "sf-bay-portrait.jpg JPEG 480x640 480x640+0+0 8-bit sRGB 40638B",
].join("\n");

export const TYPECHECK_NO_OBJECT_POSITION = [
  "src/plugins/core/components/composer/attachments.tsx:176:13 - error TS2322: Type '{ width: number; height: number; borderRadius: number; objectPosition: string; }' is not assignable to type 'StyleDesc'.",
  "  Object literal may only specify known properties, and 'objectPosition' does not exist in type 'StyleDesc'.",
  "",
  "  176 |             objectPosition: cropPosition(image.src),",
  "      |             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  "",
  "Found 1 error in src/plugins/core/components/composer/attachments.tsx:176",
].join("\n");

export const TYPECHECK_CLEAN = "tsc --noEmit\nno errors";

export const TILE_PATCH = [
  "--- src/plugins/core/components/composer/attachments.tsx",
  "+++ src/plugins/core/components/composer/attachments.tsx",
  "@@ -121,9 +121,16 @@",
  " function thumbImage(size: number): StyleDesc {",
  "   const inner = size - 2 * THUMB_BORDER;",
  "   return {",
  "     width: inner,",
  "     height: inner,",
  "     borderRadius: 0,",
  "   };",
  " }",
  "+",
  "+export function cropPosition(width: number, height: number): CropPosition {",
  '+  if (height > width) return "top";',
  '+  if (width > height * 1.4) return "center";',
  '+  return "center";',
  "+}",
].join("\n");

export const TILE_DIFF = [
  "+export function cropPosition(width: number, height: number): CropPosition {",
  '+  if (height > width) return "top";',
  '+  if (width > height * 1.4) return "center";',
  '+  return "center";',
  "+}",
].join("\n");

export const CROP_POSITION_MODULE = [
  'import { useAdwaita } from "adwaita-gpuix";',
  'import type { CropPosition } from "./crop";',
  "",
  "export function cropPosition(",
  "  width: number,",
  "  height: number,",
  "): CropPosition {",
  '  if (width <= 0 || height <= 0) return "centre";',
  '  if (height > width) return "top";',
  '  if (width > height * 1.4) return "centre";',
  '  return "centre";',
  "}",
  "",
  "export function thumbSize(size: number, border: number): number {",
  "  return Math.max(0, size - 2 * border);",
  "}",
  "",
  "export function useThumbCrop(size: number): CropPosition {",
  "  const t = useAdwaita();",
  "  return cropPosition(size * t.scaleFactor, size);",
  "}",
].join("\n");

/** A second module, caught mid-write: the call is open and the text is arriving. */
export const THUMB_LAYOUT_MODULE = [
  'import { useAdwaita } from "adwaita-gpuix";',
  'import type { StyleDesc, AdwaitaTheme } from "@gpuix/react";',
  "",
  "export const ATTACHMENT_THUMB = 48;",
  "",
  "export function thumbBox(t: AdwaitaTheme, size: number): StyleDesc {",
  "  return {",
  "    width: size,",
  "    height: size,",
  "    flexShrink: 0,",
  "    borderRadius: t.radius.sm,",
  "  };",
  "}",
].join("\n");

export const CAPTURE_ALL = [
  "  ✓ stories/AgentActions/work.png (198402 bytes)",
  "  ✓ stories/Changes/panel.png (161208 bytes)",
  "  ✓ stories/Chat/session.png (205771 bytes)",
  "  ✓ stories/Composer/drafting.png (188034 bytes)",
  "  ✓ stories/History/tree.png (112466 bytes)",
  "  ✓ stories/Models/model.png (244190 bytes)",
  "  ✓ stories/Models/thinking.png (96221 bytes)",
  "  ✓ stories/ProjectHeader/opens.png (149112 bytes)",
  "  ✓ stories/Questions/asked.png (131445 bytes)",
  "  ✓ stories/Sessions/list.png (58017 bytes)",
  "  ✓ stories/StatusBar/bar.png (168209 bytes)",
  "  ✓ stories/WebSearch/results.png (181655 bytes)",
  "",
  "12 ok, 0 failed → ~/Projects/gpuix-apps/mu",
].join("\n");

export const CAPTURE_CHAT = [
  "  ✓ stories/Chat/session.png (205771 bytes)",
  "",
  "1 ok, 0 failed → ~/Projects/gpuix-apps/mu",
].join("\n");

export const MONTAGE_SHEET = [
  "sheet.webp  1290x366  4 tiles, 16 px gap",
  "  sunlit-meadow.jpg   → 318x180  centre crop",
  "  underwater-swimmer.jpg → 318x180  centre crop",
  "  chicago-river.jpg   → 318x180  centre crop",
  "  star-trails.jpg     → 318x180  centre crop",
  "sf-bay-portrait.jpg skipped: 480x640 is not 16:9",
].join("\n");
