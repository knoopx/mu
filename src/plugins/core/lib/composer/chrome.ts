import { useAdwaita, type AdwaitaTheme } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";
import { composerFill, type ComposerTone } from "../ui/theme";
import { codeLineBox, HAIRLINE, ROW_HEIGHT } from "../ui/tokens";

/**
 * The frame every panel in the composer slot is built from: the draft's own
 * panel, the question panel, the changes panel and the history panel.
 *
 * The measurements are stated once here and read by all four, because a panel's
 * ink is only ever in one column: the box sits `panelPageInset` in from the
 * slot, and everything the panel says — the draft, a row's label, a note, the
 * status line — sits `panelInset` inside the box. A row's own hover band runs to
 * the box's edge, so a row is wider than its text by exactly `panelInset`; that
 * is the one difference a panel is allowed to draw.
 *
 * `lib/composer/panelHeight.ts` does the arithmetic over these numbers, so a
 * padding changed here moves a panel's row budget with it.
 */

/** How far a panel's box stands in from the composer slot's edge. */
export const panelPageInset = (t: AdwaitaTheme): number => t.space.lg;

/** How far a panel's ink sits inside its box: draft, row label, note, status line. */
export const panelInset = (t: AdwaitaTheme): number => t.space.sm;

/** How much air a panel keeps above and below its slots. */
export const panelPadY = (t: AdwaitaTheme): number => t.space.sm;

/** The gap between the slots of one panel: draft, list, status line. */
export const panelGap = (t: AdwaitaTheme): number => t.space.xs;

/** The gap between two panes of one panel, each with its own list. */
export const paneGap = (t: AdwaitaTheme): number => t.space.md;

/** The air around a rule that divides one panel's panes. */
export const ruleGap = (t: AdwaitaTheme): number => t.space.md;

/** The panel's own band: its box, its fill, its breathing. */
export function panelBox(t: AdwaitaTheme, tone: ComposerTone): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minHeight: 0,
    minWidth: 0,
    paddingLeft: panelPageInset(t),
    paddingRight: panelPageInset(t),
    paddingTop: panelPadY(t),
    paddingBottom: panelPadY(t),
    gap: panelGap(t),
    position: "relative",
    borderRadius: t.radius.md,
    borderWidth: 0,
    overflow: "hidden",
    backgroundColor: composerFill(t, tone),
  };
}

/** A hairline across a panel, in the colour that panel's tone asks for. */
export const ruleH = (t: AdwaitaTheme, color: string): StyleDesc => ({
  height: HAIRLINE,
  alignSelf: "stretch",
  flexShrink: 0,
  backgroundColor: color,
  pointerEvents: "none",
});

/** A hairline down a panel, between two panes. */
export const ruleV = (t: AdwaitaTheme, color: string): StyleDesc => ({
  width: HAIRLINE,
  alignSelf: "stretch",
  flexShrink: 0,
  backgroundColor: color,
  pointerEvents: "none",
});

export interface PanelChrome {
  column: StyleDesc;
  fillColumn: StyleDesc;
  splitRow: StyleDesc;
  listPane: (width?: number) => StyleDesc;
  /** A pane of a split panel that takes its share of the width rather than a fixed column. */
  flexPane: (grow: number) => StyleDesc;
  widePane: StyleDesc;
  previewPane: StyleDesc;
  previewCode: StyleDesc;
  paneRule: StyleDesc;
  paneRuleH: StyleDesc;
  rowList: (rows: number) => StyleDesc;
  /** The slot a virtual list stands one row in. */
  rowSlot: StyleDesc;
  statusBar: StyleDesc;
  emptyPane: StyleDesc;
}

export function panelChrome(t: AdwaitaTheme): PanelChrome {
  const column: StyleDesc = { display: "flex", flexDirection: "column" };
  return {
    column,
    fillColumn: { ...column, flexGrow: 1, minHeight: 0 },
    splitRow: {
      display: "flex",
      flexDirection: "row",
      gap: paneGap(t),
      flexGrow: 1,
      minHeight: 0,
      minWidth: 0,
    },
    listPane(width = t.control.sidebarWidth): StyleDesc {
      return { ...column, width, flexShrink: 0 };
    },
    flexPane(grow: number): StyleDesc {
      return {
        ...column,
        flexGrow: grow,
        flexBasis: 0,
        minWidth: t.control.sidebarMinWidth,
        minHeight: 0,
      };
    },
    widePane: {
      ...column,
      flexGrow: 1,
      flexBasis: 0,
      minHeight: 0,
      minWidth: 0,
    },
    previewPane: {
      ...column,
      flexGrow: 1,
      flexBasis: 0,
      minWidth: 0,
      minHeight: 0,
    },
    previewCode: {
      flexGrow: 1,
      minHeight: 0,
      overflow: "hidden",
      fontSize: t.type.caption,
      lineHeight: codeLineBox(t),
      fontFamily: t.type.fontFamilyMono,
      color: t.color.text.primary,
    },
    paneRule: ruleV(t, t.color.divider.default),
    paneRuleH: {
      ...ruleH(t, t.color.divider.default),
      marginTop: ruleGap(t),
      marginBottom: ruleGap(t),
    },
    rowList(rows: number): StyleDesc {
      return {
        ...column,
        flexShrink: 0,
        height: rows * ROW_HEIGHT,
        minHeight: 0,
        overflow: "hidden",
      };
    },
    rowSlot: {
      ...column,
      width: "100%",
      flexShrink: 0,
    },
    statusBar: {
      flexShrink: 0,
      height: t.control.statusBarHeight,
      paddingLeft: panelInset(t),
      paddingRight: panelInset(t),
      backgroundColor: "transparent",
    },
    emptyPane: {
      display: "flex",
      flexGrow: 1,
      minHeight: 0,
      alignItems: "center",
      justifyContent: "center",
    },
  };
}

export function usePanelChrome(): PanelChrome {
  return panelChrome(useAdwaita());
}
