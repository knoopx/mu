import { type AdwaitaTheme } from "adwaita-gpuix";
import { composerPanelRowHeight } from "../../components/composer/rows";
import { ROW_HEIGHT } from "../ui/tokens";
import type { ComposerPanelRow } from "../../components/composer/Composer";

const PANEL_WINDOW_FRACTION = 0.8;
const PANEL_MIN_HEIGHT = 480;
const PANEL_MAX_HEIGHT = 760;

export const PANEL_FIT_MIN_ROWS = 4;

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

export function composerPanelChrome(
  t: AdwaitaTheme,
  statusBar = false,
  fieldExtra = 0,
): number {
  return (
    ROW_HEIGHT +
    fieldExtra +
    2 * t.space.sm +
    t.space.xs +
    (statusBar ? t.control.statusBarHeight + t.space.xs : 0)
  );
}

export function composerPanelRowsForHeight(
  t: AdwaitaTheme,
  panelHeight: number,
  statusBar = false,
  fieldExtra = 0,
): number {
  return Math.max(
    PANEL_FIT_MIN_ROWS,
    Math.floor(
      (panelHeight - composerPanelChrome(t, statusBar, fieldExtra)) /
        ROW_HEIGHT,
    ),
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
  statusBar = false,
  fieldExtra = 0,
): number {
  return Math.min(
    composerPanelHeight(windowHeight),
    composerPanelChrome(t, statusBar, fieldExtra) + listHeight,
  );
}
