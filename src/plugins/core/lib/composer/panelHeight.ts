import { type AdwaitaTheme } from "adwaita-gpuix";
import { composerPanelRowHeight } from "../../components/composer/rows";
import type { ComposerPanelRow } from "../../components/composer/Composer";

const PANEL_WINDOW_FRACTION = 0.8;
const PANEL_MIN_HEIGHT = 480;
const PANEL_MAX_HEIGHT = 760;

export const PANEL_FIT_MIN_ROWS = 4;

export const DIFF_MAX_LINES = 20;

export const CODE_LINE_HEIGHT = 18;

export function diffRuleHeight(t: AdwaitaTheme): number {
  return t.control.dividerThickness + 2 * t.space.md;
}

export function diffLines(patch: string): number {
  if (patch.length === 0) return 0;
  return Math.min(patch.split("\n").length, DIFF_MAX_LINES);
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

export function composerPanelChrome(
  t: AdwaitaTheme,
  statusBar = false,
  fieldExtra = 0,
): number {
  return (
    t.control.rowHeight +
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
    4,
    Math.floor(
      (panelHeight - composerPanelChrome(t, statusBar, fieldExtra)) /
        t.control.rowHeight,
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
  return Math.max(4, count);
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
