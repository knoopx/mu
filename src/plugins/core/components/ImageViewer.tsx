/**
 * The picture the window is showing full-screen.
 *
 * A log's picture is a thumbnail — a tile beside a file read, a square in a
 * message, one side of a change squeezed into a preview pane — and none of them
 * says what the picture actually is. This layer gives it the whole window: the
 * page inset stays, the picture is scaled into what is left of it without
 * distortion, and the words that name it (the file, the kind, the size, which
 * side of a change) stand under it in the same caption measure the log uses.
 *
 * The ground is near-black whatever theme the window wears, so the words on it
 * are fixed light ink rather than the theme's — see `PICTURE_*` in
 * `../lib/ui/theme`. The picture itself takes no click: clicking the ground
 * beside it, the close mark, or Escape all put it away, and with a group of them
 * the arrows walk it.
 */
import { type JSX } from "react";
import {
  Icon,
  ShortcutHints,
  T,
  groupHints,
  useAdwaita,
  type AdwaitaTheme,
} from "adwaita-gpuix";
import { type StyleDesc } from "@gpuix/react";

import { useImageViewer } from "../hooks/useImageViewer";
import { imageViewer, viewerHints } from "../lib/ui/imageViewer";
import {
  PICTURE_GROUND,
  PICTURE_HOVER,
  PICTURE_INK,
  PICTURE_INK_MUTED,
  PICTURE_KEYS,
  PICTURE_RULE,
} from "../lib/ui/theme";
import { HAIRLINE, figureGap, lineBox } from "../lib/ui/tokens";

/** How far the picture stands in from the window's edges. */
const VIEWER_INSET = 32;

/** The box a close mark sits in, and the glyph that fills it. */
const CLOSE_BOX = 28;
const CLOSE_GLYPH = 15;

const layer = (t: AdwaitaTheme): StyleDesc => ({
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  gap: t.space.md,
  padding: VIEWER_INSET,
  backgroundColor: PICTURE_GROUND,
  pointerEvents: "auto",
  userSelect: "none",
});

const headRow = (t: AdwaitaTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: figureGap(t),
  flexShrink: 0,
  minWidth: 0,
});

/** The picture's own page: everything the head and the caption are not. */
const stage: StyleDesc = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  flexGrow: 1,
  flexBasis: 0,
  minHeight: 0,
  minWidth: 0,
  width: "100%",
};

const captionRule: StyleDesc = {
  height: HAIRLINE,
  alignSelf: "stretch",
  flexShrink: 0,
  backgroundColor: PICTURE_RULE,
  pointerEvents: "none",
};

const captionRow = (t: AdwaitaTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: t.space.lg,
  flexShrink: 0,
  minWidth: 0,
});

const closeBox: StyleDesc = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  width: CLOSE_BOX,
  height: CLOSE_BOX,
  flexShrink: 0,
  borderRadius: CLOSE_BOX / 2,
  cursor: "pointer",
  hover: { backgroundColor: PICTURE_HOVER },
};

export function ImageViewer(): JSX.Element | null {
  const t = useAdwaita();
  const view = useImageViewer();
  if (view === null) return null;
  const picture = view.pictures[view.active];
  if (picture === undefined) return null;

  const walking = view.pictures.length > 1;
  const close = (): void => imageViewer.close();

  return (
    <div style={layer(t)} onClick={close}>
      <div style={headRow(t)}>
        <T
          size="caption"
          color={PICTURE_INK}
          style={{
            fontFamily: t.type.fontFamilyMono,
            lineHeight: lineBox(t, "caption"),
            minWidth: 0,
            flexShrink: 1,
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {picture.title}
        </T>
        {walking ? (
          <T size="caption" color={PICTURE_INK_MUTED}>
            {`${String(view.active + 1)} / ${String(view.pictures.length)}`}
          </T>
        ) : null}
        <div style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }} />
        <div style={closeBox} onClick={close}>
          <Icon name="close" size={CLOSE_GLYPH} color={PICTURE_INK} />
        </div>
      </div>

      <div style={stage}>
        <img
          src={picture.src}
          alt={picture.title}
          objectFit="contain"
          style={{
            width: "100%",
            height: "100%",
            borderWidth: 0,
            backgroundColor: "transparent",
          }}
        />
      </div>

      <div style={captionRule} />
      <div style={captionRow(t)}>
        {picture.detail === "" ? null : (
          <T
            size="caption"
            color={PICTURE_INK_MUTED}
            style={{
              lineHeight: lineBox(t, "caption"),
              minWidth: 0,
              flexShrink: 1,
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {picture.detail}
          </T>
        )}
        <div style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }} />
        <ShortcutHints
          groups={groupHints(viewerHints(walking))}
          colors={PICTURE_KEYS}
          labelColor={PICTURE_INK_MUTED}
          style={{ flexShrink: 0 }}
        />
      </div>
    </div>
  );
}
