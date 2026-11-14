import { useAdwaita, type AdwaitaTheme } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";
import { PAGE_INSET } from "../ui/transcriptLayout";
import { composerFill, type ComposerTone } from "../ui/theme";
import { codeLineBox, HAIRLINE, ROW_HEIGHT } from "../ui/tokens";

/**
 * The frame every panel in the composer slot is built from: the draft's own
 * panel, the question panel, the changes panel and the history panel.
 *
 * The measurements are stated once here and read by all four, and they obey one
 * rule about a band's four sides: the box pads itself by `panelPad` — the same
 * measure left, top, right and bottom, so a panel breathes equally on every
 * side — and everything the panel *says* stands `panelInset` further in. So a
 * panel's ink sits at twice its own breathing in from the left and right and at
 * one measure from the top and bottom: a 1x2 width-to-height ratio, which is the
 * shape mu's bands keep (an equal padding is its degenerate case; a chip or an
 * inline mark is not a band and keeps its own measure). A row's own hover band
 * runs to its pane's edge and only its ink steps in; that is the one difference
 * a panel is allowed to draw, and the
 * reason `paneInk` exists for the ink a pane holds that is not a row.
 *
 * `lib/composer/panelHeight.ts` does the arithmetic over these numbers, so a
 * padding changed here moves a panel's row budget with it.
 */

/** The panel's one padding unit: what its box pads itself by on all four sides. */
const panelPad = (t: AdwaitaTheme): number => t.space.sm;

/** How far a panel's box pads its content in from its left and right edges. */
export const panelPageInset = (t: AdwaitaTheme): number => panelPad(t);

/** How much air a panel keeps above and below its slots — its sides' measure. */
export const panelPadY = (t: AdwaitaTheme): number => panelPad(t);

/**
 * How far a panel's ink stands inside its band: the draft, a row's label, a
 * note, the status line, a preview. One step beyond the box's own padding, so
 * the ink column is twice the band's breathing wide and one step deep.
 */
export const panelInset = (t: AdwaitaTheme): number => panelPad(t);

/** The gap between the slots of one panel: draft, list, status line. */
export const panelGap = (t: AdwaitaTheme): number => t.space.xs;

/** The gap between two panes of one panel: one step above the slot gap. */
export const paneGap = (t: AdwaitaTheme): number => 2 * panelGap(t);

/** The air around a rule that divides one panel's panes. */
export const ruleGap = (t: AdwaitaTheme): number => paneGap(t);

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

/**
 * The ink column of a pane, for the ink a pane holds that is not a row: a
 * preview, a caption, a note, a block of prose. A row pads its own ink and lets
 * its band run to the pane's edge; anything else has to step in by the same
 * measure or it lands in a second column.
 */
export const paneInk = (t: AdwaitaTheme): StyleDesc => ({
  paddingLeft: panelInset(t),
  paddingRight: panelInset(t),
});

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
      ...paneInk(t),
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
