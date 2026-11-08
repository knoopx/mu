import { type AdwaitaTheme } from "adwaita-gpuix";
import { composerPanelRowHeight } from "../../components/composer/rows";
import { ROW_HEIGHT } from "../ui/tokens";
import { panelGap, panelPadY } from "./chrome";
import { fieldFirstRowHeight } from "./fieldRows";
import type { ComposerPanelRow } from "../../components/composer/Composer";

const PANEL_WINDOW_FRACTION = 0.8;
const PANEL_MIN_HEIGHT = 480;
const PANEL_MAX_HEIGHT = 760;

export const PANEL_FIT_MIN_ROWS = 4;

/** Which slots a panel draws, so it is charged chrome only for what it paints. */
export interface PanelSlots {
  /** A draft field above the list. The wide panels — changes, history — draw none. */
  field?: boolean;
  statusBar?: boolean;
  /** Lines of a multi-row draft beyond its first. */
  fieldExtra?: number;
}

export function composerPanelHeight(windowHeight: number | undefined): number {
  const h =
    typeof windowHeight === "number" && windowHeight > 0
      ? windowHeight
      : PANEL_MIN_HEIGHT;
  return Math.max(
    PANEL_MIN_HEIGHT,
    Math.min(Math.floor(h * PANEL_WINDOW_FRACTION), PANEL_MAX_HEIGHT),
  );
}

/**
 * What a panel spends on itself rather than on rows: the draft's first row, the
 * rest of a multi-row draft, the box's breathing, and one gap before every slot
 * stacked under the first. Every term is read from the chrome that draws the
 * panel and the field that stands in it, so the row budget and the pixels agree.
 */
export function panelChromeHeight(t: AdwaitaTheme, slots: PanelSlots): number {
  const field = slots.field !== false;
  const statusBar = slots.statusBar === true;
  const stacked = 1 + (field ? 1 : 0) + (statusBar ? 1 : 0);
  return (
    (field ? fieldFirstRowHeight(t) : 0) +
    (slots.fieldExtra ?? 0) +
    2 * panelPadY(t) +
    (stacked - 1) * panelGap(t) +
    (statusBar ? t.control.statusBarHeight : 0)
  );
}

export function composerPanelRowsForHeight(
  t: AdwaitaTheme,
  panelHeight: number,
  slots: PanelSlots = {},
): number {
  return Math.max(
    PANEL_FIT_MIN_ROWS,
    Math.floor((panelHeight - panelChromeHeight(t, slots)) / ROW_HEIGHT),
  );
}

export function composerPanelFitRows(
  t: AdwaitaTheme,
  rows: readonly ComposerPanelRow[],
  available: number,
): number {
  let used = 0;
  let count = 0;
  for (const row of rows) {
    const height = composerPanelRowHeight(t, row);
    if (count > 0 && used + height > available) break;
    used += height;
    count += 1;
  }
  return Math.max(PANEL_FIT_MIN_ROWS, count);
}

export function composerPanelFitHeight(
  t: AdwaitaTheme,
  windowHeight: number | undefined,
  listHeight: number,
  slots: PanelSlots = {},
): number {
  return Math.min(
    composerPanelHeight(windowHeight),
    panelChromeHeight(t, slots) + listHeight,
  );
}
