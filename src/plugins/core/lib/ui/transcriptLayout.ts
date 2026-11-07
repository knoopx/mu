import { type AdwaitaTheme } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import { bandFill, composerFill } from "./theme";

export const PAGE_INSET = 56;

export function growColumn(grow: number): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    flexGrow: grow,
    flexBasis: 0,
    minHeight: 0,
    minWidth: 0,
  };
}

export function conversationGap(t: AdwaitaTheme): number {
  return t.space.xl;
}

export function composerGap(t: AdwaitaTheme): number {
  return conversationGap(t);
}

function hintsRow(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.sm,
    flexShrink: 0,
    minHeight: t.control.rowHeight,
    paddingLeft: t.space.sm,
    paddingRight: t.space.sm,
    paddingTop: t.space.xs,
    paddingBottom: t.space.xs,
    borderTopWidth: 1,
    borderColor: t.color.divider.default,
    overflow: "hidden",
  };
}

function panelShell(t: AdwaitaTheme): StyleDesc {
  return {
    ...growColumn(1),
    gap: 0,
    padding: 0,
    borderRadius: t.radius.md,
    backgroundColor: composerFill(t),
    overflow: "hidden",
  };
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
  Math.round(t.type.caption * 1.6);

export function outputPanel(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    flexShrink: 1,
    padding: 10,
    borderRadius: t.radius.sm,
    borderWidth: 0,
    backgroundColor: bandFill(t),
  };
}
