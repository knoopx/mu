/**
 * A picture in the log that opens full-screen when it is clicked over.
 *
 * Every picture the log draws is too small to read: a file read shows one at tile
 * size, a message shows the ones it carried as squares, a change shows an image's
 * two sides inside a preview pane. Each of those boxes is a different shape, but
 * the click is the same one everywhere, so it lives here — the box is the caller's,
 * the behaviour is this component's.
 *
 * The badge is the affordance, and it is the one mu already uses: hovering a
 * thumbnail brings a mark up in its corner saying what the click does, exactly as
 * a staged attachment's thumb brings up the remove mark. A box too small to wear
 * the mark cleanly is given `badge: 0` and relies on the pointer.
 */
import { useState, type JSX } from "react";
import { Icon, useAdwaita, type AdwaitaTheme } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import {
  viewPicture,
  viewPictures,
  type ViewerPicture,
} from "../lib/ui/imageViewer";

/** The glyph that says *look at this*, and how much room it wants. */
const BADGE_GLYPH_RATIO = 0.6;

const wrapper = (t: AdwaitaTheme, style: StyleDesc): StyleDesc => ({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  borderRadius: t.radius.sm,
  cursor: "pointer",
  ...style,
});

const fill: StyleDesc = {
  width: "100%",
  height: "100%",
  borderWidth: 0,
};

const badgeStyle = (
  t: AdwaitaTheme,
  size: number,
): StyleDesc => ({
  position: "absolute",
  top: t.space.xs,
  right: t.space.xs,
  width: size,
  height: size,
  borderRadius: size / 2,
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: t.color.accent.base,
  pointerEvents: "none",
});

export interface ZoomImageProps {
  src: string;

  /** what the picture is called: the file it came from, or its alt line */
  title: string;

  /** its kind and size, or which side of a change it is */
  detail: string;

  /**
   * The pictures this one belongs to, in the order the log draws them — the
   * images of one message, or the two sides of one change. With more than one the
   * viewer's arrows walk them; on its own a picture has no next one.
   */
  group?: readonly ViewerPicture[];

  /** where this picture stands in its group */
  at?: number;

  /** the box the caller wants the picture drawn in; this component only adds the click */
  box?: StyleDesc;

  objectFit?: "contain" | "cover";

  /** the corner mark's diameter; 0 draws no mark, for a box too small to wear one */
  badge?: number;
}

export function ZoomImage({
  src,
  title,
  detail,
  group,
  at = 0,
  box = {},
  objectFit = "contain",
  badge = 0,
}: ZoomImageProps): JSX.Element {
  const t = useAdwaita();
  const [hover, setHover] = useState(false);

  const open = (): void => {
    if (group !== undefined && group.length > 1) viewPictures(group, at);
    else viewPicture({ src, title, detail });
  };

  return (
    <div
      style={wrapper(t, box)}
      onClick={open}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <img src={src} alt={title} objectFit={objectFit} style={fill} />
      {hover === true && badge > 0 ? (
        <div style={badgeStyle(t, badge)}>
          <Icon
            name="search"
            size={Math.round(badge * BADGE_GLYPH_RATIO)}
            color={t.color.accent.fg}
          />
        </div>
      ) : null}
    </div>
  );
}
