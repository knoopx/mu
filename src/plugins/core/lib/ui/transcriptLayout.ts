import { type AdwaitaTheme } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import { bandFill } from "./theme";
import { lineBox } from "./tokens";

export const PAGE_INSET = 56;

/** The air between two blocks of the log — and above the composer, the same step.
 *  `composerGap` is the role's name for it; neither file may write `space.xl`. */
export function conversationGap(t: AdwaitaTheme): number {
  return t.space.xl;
}

export function composerGap(t: AdwaitaTheme): number {
  return conversationGap(t);
}

/** The block a tool shows its own output in: lines read, lines written, a patch. */
export function toolPreviewWrap(
  t: AdwaitaTheme,
  style?: Partial<StyleDesc>,
): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    gap: t.space.xs,
    paddingLeft: 0,
    minWidth: 0,
    flexShrink: 0,
    ...style,
  };
}

/** One line of a text preview, at the caption rhythm every preview keeps. */
export const previewLineHeight = (t: AdwaitaTheme): number =>
  lineBox(t, "caption");

/** The line rhythm of a user's own words — looser than the theme's tight body. */
export const userMessageLineHeight = (t: AdwaitaTheme): number =>
  lineBox(t, "body");

export function outputPanel(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    flexShrink: 1,
    padding: t.space.sm,
    borderRadius: t.radius.sm,
    borderWidth: 0,
    backgroundColor: bandFill(t),
  };
}
