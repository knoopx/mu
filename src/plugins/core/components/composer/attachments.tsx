import { randomUUID } from "node:crypto";
import {
  formatSize,
  type PromptOptions,
} from "@earendil-works/pi-coding-agent";
import {
  Icon,
  isRenderableImage,
  useAdwaita,
  type AdwaitaTheme,
} from "adwaita-gpuix";
import { useState, type JSX } from "react";
import type { StyleDesc } from "@gpuix/react";

import type { ToolImage } from "../../lib/agent/content";
import { row } from "../../lib/ui/layout";
import { mediaKind } from "../../lib/ui/media";
import { HAIRLINE } from "../../lib/ui/tokens";
import type { ViewerPicture } from "../../lib/ui/imageViewer";
import { StateSpinner } from "../StateSpinner";
import { ZoomImage } from "../ZoomImage";

export interface ComposerAttachment {
  id: string;

  src: string;

  data: string;

  mimeType: string;

  bytes: number;

  label: string;
}

export type PromptImages = PromptOptions["images"];

function shortLabel(mimeType: string, bytes: number): string {
  return `${mediaKind(mimeType)} · ${formatSize(bytes)}`;
}

function baseType(mimeType: string): string {
  return (mimeType.split(";")[0] ?? mimeType).trim().toLowerCase();
}

export function attachmentOf(
  data: Buffer,
  mimeType: string,
): ComposerAttachment {
  const b64 = data.toString("base64");
  const type = baseType(mimeType);
  return {
    id: randomUUID(),
    data: b64,
    src: `data:${type};base64,${b64}`,
    mimeType: type,
    bytes: data.length,
    label: shortLabel(type, data.length),
  };
}

function attachmentsOf(
  images: Array<{ data: string; mimeType: string }>,
): ComposerAttachment[] {
  return images.map((image) =>
    attachmentOf(Buffer.from(image.data, "base64"), image.mimeType),
  );
}

export function attachmentImages(
  attachments: readonly ComposerAttachment[],
): PromptImages {
  return attachments.map((attachment) => ({
    type: "image" as const,
    data: attachment.data,
    mimeType: attachment.mimeType,
  }));
}

function attachmentImagesOf(
  images: readonly ToolImage[] | undefined,
): PromptImages {
  if (images === undefined || images.length === 0) return undefined;
  return images.map((image) => ({
    type: "image" as const,
    data: image.src.slice(image.src.indexOf(",") + 1),
    mimeType: image.mimeType,
  }));
}

/** An attachment's thumbnail: a square, bordered by a hairline, with a remove badge in its corner. */
export const ATTACHMENT_THUMB = 48;

/** The badge a thumb wears in its corner, and the glyph that fills the badge. */
const REMOVE_RATIO = 0.375;
const REMOVE_GLYPH_RATIO = 0.55;

function thumbBox(t: AdwaitaTheme, size: number): StyleDesc {
  return {
    position: "relative",
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: t.radius.sm,
    borderWidth: HAIRLINE,
    borderColor: t.color.border.default,
    backgroundColor: t.color.surface.raised,
    overflow: "hidden",
  };
}

function thumbCenter(t: AdwaitaTheme, size: number): StyleDesc {
  return {
    ...thumbBox(t, size),
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  };
}

function thumbImage(size: number): StyleDesc {
  const inner = size - 2 * HAIRLINE;
  return {
    width: inner,
    height: inner,
    borderRadius: 0,
  };
}

function removeBadge(t: AdwaitaTheme, size: number): StyleDesc {
  const box = Math.round(size * REMOVE_RATIO);
  return {
    position: "absolute",
    top: t.space.xs,
    right: t.space.xs,
    width: box,
    height: box,
    borderRadius: box / 2,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.color.accent.base,
    pointerEvents: "none",
  };
}

const thumbStrip = (t: AdwaitaTheme, extra?: Partial<StyleDesc>): StyleDesc =>
  row(t.space.sm, { flexWrap: "wrap", ...extra });

export interface AttachmentThumbsProps {
  images: readonly ToolImage[];
  size?: number;
}

/**
 * A sent message's pictures, in the order the message carried them. The row names
 * them by place because a message's images have no filenames: what was pasted in
 * arrives as pixels, and the only thing that tells them apart is which one the
 * message had first.
 */
function messagePictures(images: readonly ToolImage[]): ViewerPicture[] {
  return images.map((image, i) => ({
    src: image.src,
    title: `image ${String(i + 1)} of ${String(images.length)}`,
    detail: `${mediaKind(image.mimeType)} · ${formatSize(image.bytes)} — sent with the message`,
  }));
}

export function AttachmentThumbs(
  props: AttachmentThumbsProps,
): JSX.Element | null {
  const t = useAdwaita();
  const size = props.size ?? ATTACHMENT_THUMB;
  const images = props.images.filter((image) =>
    isRenderableImage(image.src, image.mimeType),
  );
  if (images.length === 0) return null;
  const pictures = messagePictures(images);
  return (
    <div style={thumbStrip(t, { paddingTop: t.space.sm })}>
      {pictures.map((picture, i) => (
        <ZoomImage
          key={`${picture.src.slice(0, 40)}-${i}`}
          src={picture.src}
          title={picture.title}
          detail={picture.detail}
          group={pictures}
          at={i}
          box={thumbBox(t, size)}
          objectFit="cover"
          badge={Math.round(size * REMOVE_RATIO)}
        />
      ))}
    </div>
  );
}

export interface ComposerAttachmentsProps {
  attachments: readonly ComposerAttachment[];

  busy?: boolean;

  onRemove: (id: string) => void;
}

function AttachmentThumb(props: {
  attachment: ComposerAttachment;
  size: number;
  onRemove: (id: string) => void;
}): JSX.Element {
  const t = useAdwaita();
  const [hover, setHover] = useState(false);
  const removeSize = Math.round(props.size * REMOVE_RATIO);
  return (
    <div
      style={{
        ...thumbBox(t, props.size),
        cursor: "pointer",
      }}
      onClick={() => props.onRemove(props.attachment.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <img
        src={props.attachment.src}
        alt={props.attachment.label}
        objectFit="cover"
        style={thumbImage(props.size)}
      />
      {hover === true ? (
        <div style={removeBadge(t, props.size)}>
          <Icon
            name="close"
            size={Math.round(removeSize * REMOVE_GLYPH_RATIO)}
            color={t.color.accent.fg}
          />
        </div>
      ) : null}
    </div>
  );
}

export function ComposerAttachments(
  props: ComposerAttachmentsProps,
): JSX.Element | null {
  const t = useAdwaita();
  const { busy } = props;
  const attachments = props.attachments.filter((attachment) =>
    isRenderableImage(attachment.src, attachment.mimeType),
  );
  if (attachments.length === 0 && busy !== true) return null;
  const size = ATTACHMENT_THUMB;

  return (
    <div style={thumbStrip(t, { flexShrink: 0, userSelect: "none" })}>
      {attachments.map((attachment) => (
        <AttachmentThumb
          key={attachment.id}
          attachment={attachment}
          size={size}
          onRemove={props.onRemove}
        />
      ))}
      {busy === true ? (
        <div style={thumbCenter(t, size)}>
          <StateSpinner />
        </div>
      ) : null}
    </div>
  );
}
