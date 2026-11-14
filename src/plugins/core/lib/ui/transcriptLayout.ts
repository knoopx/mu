import { type AdwaitaTheme } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import { bandFill } from "./theme";
import { lineBox } from "./tokens";

export const PAGE_INSET = 56;

/** The air between two blocks of the log — and above the composer, the same step.
 *  `composerGap` is the role's name for it; neither file may write `space.xl`. */
function conversationGap(t: AdwaitaTheme): number {
  return t.space.xl;
}

export function composerGap(t: AdwaitaTheme): number {
  return conversationGap(t);
}

/** The row of lines inside a band: one line per text line, no plate of its own. */
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

/**
 * The one band a tool's answer stands on.
 *
 * Every answer the log shows — the lines a read quoted, the lines a write left,
 * a patch, rows of a table, a plot, a tree, a printed command — sits on this same
 * plate, so a tool row reads as *an answer* rather than as loose lines on the log
 * with a card only where one tool happens to quote text. Nothing inside a band
 * gets to draw a second plate: an output box on the band is flattened to the
 * band's own colour, and a diagram takes it as its page.
 */
export function toolBand(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    gap: t.space.xs,
    minWidth: 0,
    flexShrink: 1,
    padding: t.space.sm,
    borderRadius: t.radius.sm,
    borderWidth: 0,
    backgroundColor: bandFill(t),
  };
}
