/**
 * How a tool row is painted, once.
 *
 * Every plugin's transcript rows are the same handful of theme decisions: the
 * colour a tone wears, the badge a state gets, the width of an id column, the
 * fill of a meter, the divider between two data rows. They live here so a
 * plugin supplies the words and the mapping of its own states, and the drawing
 * of a row is one implementation for the whole log. Nothing here knows a tool.
 */

import {
  rowHoverBg,
  type AdwaitaTheme,
  type BadgeVariant,
  type IconName,
} from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import { mutedText } from "./theme";
import { toolGapColumn, toolLine } from "./toolRows";

/** The colour roles a tool row can paint. */
export type ToolRowTone = "neutral" | "accent" | "ok" | "warn" | "bad";

/** How far a score fills its meter track. */
export interface ToolRowMeter {
  score: number;
  worst: number;
}

/** A label and the value a call resolved for it — one chip on the identity line. */
export interface ToolRowCell {
  label: string;
  value: string;
}

/**
 * One row as the log draws it: an id, a body, and only what this row carries.
 * A finding brings a meter, a clone group brings its instances as member
 * lines, a call-chain edge says whether it left the project, and a revision
 * brings nothing but its two lines — so every extra here is optional.
 */
export interface ToolPaintRow {
  key: string;
  primary: string;
  secondary: string;
  badge: string;
  tone?: ToolRowTone;
  meter?: ToolRowMeter | null;
  members?: readonly string[];
  trailing?: string;
}

/** The value of one chip, read by a view that paints that chip itself. */
export const toolCellOf = (
  cells: readonly ToolRowCell[],
  label: string,
): string => cells.find((cell) => cell.label === label)?.value ?? "";

/** The colour of a tone, from the theme's functional and accent roles. */
export function toolToneColor(t: AdwaitaTheme, tone: ToolRowTone): string {
  if (tone === "bad") return t.color.functional.destructive;
  if (tone === "warn") return t.color.functional.warning;
  if (tone === "ok") return t.color.functional.success;
  if (tone === "accent") return t.color.accent.base;
  return mutedText(t);
}

/** A badge's variant, from the map the plugin owns; anything unmapped is plain. */
export const toolBadgeVariant = (
  badge: string,
  variants: Readonly<Record<string, BadgeVariant>>,
): BadgeVariant => variants[badge.trim().toLowerCase()] ?? "outline";

/** A bad state reads as destructive and a partial one as a warning; a clean one is good news. */
const TONE_OF_STATUS: Readonly<Record<string, ToolRowTone>> = {
  failed: "bad",
  unsupported: "bad",
  none: "ok",
};

/** The icon that states a status in words, beside the words themselves. */
const ICON_OF_STATUS: Readonly<Record<string, IconName>> = {
  failed: "close",
  unsupported: "warning",
  none: "check",
};

/** The tone of a status, with the states a plugin's own vocabulary adds. */
export const toolStatusTone = (
  status: string,
  extras: Readonly<Record<string, ToolRowTone>> = {},
): ToolRowTone => extras[status] ?? TONE_OF_STATUS[status] ?? "neutral";

/** The icon of a status, with the states a plugin's own vocabulary adds. */
export const toolStatusIcon = (
  status: string,
  extras: Readonly<Record<string, IconName>> = {},
): IconName => extras[status] ?? ICON_OF_STATUS[status] ?? "info";

/** An id column shows an id short; the reader has the full id in `details`. */
const ID_MAX = 13;

export const toolIdText = (key: string): string =>
  key.length <= ID_MAX ? key : `${key.slice(0, ID_MAX)}…`;

/** The wrapping line of identity chips under a tool's head. */
export const toolChipLine = (t: AdwaitaTheme): StyleDesc => ({
  ...toolLine(t),
  flexWrap: "wrap",
  gap: t.space.xs,
  paddingTop: 0,
});

/** One label over one resolved value, in a box of its own. */
export const toolChip = (t: AdwaitaTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: t.space.xs,
  paddingLeft: t.space.xs + 2,
  paddingRight: t.space.xs + 2,
  paddingTop: 2,
  paddingBottom: 2,
  borderRadius: t.radius.sm,
  borderWidth: t.control.dividerThickness,
  borderColor: t.color.divider.faint,
  backgroundColor: t.color.surface.button,
  flexShrink: 0,
});

/** One row of a table of rows: padded to the column edge, divided from the one above. */
export function toolDataRow(
  t: AdwaitaTheme,
  first: boolean,
  pressable = true,
): StyleDesc {
  const row: StyleDesc = {
    ...toolLine(t),
    gap: t.space.md,
    marginLeft: -t.space.sm,
    marginRight: -t.space.sm,
    paddingLeft: t.space.sm,
    paddingRight: t.space.sm,
    borderRadius: t.radius.sm,
    borderTopWidth: first ? 0 : t.control.dividerThickness,
    borderColor: t.color.divider.faint,
    hover: { backgroundColor: rowHoverBg(t) },
  };
  return pressable
    ? { ...row, active: { backgroundColor: t.color.surface.active } }
    : row;
}

/** The id column: a fixed mono width, so every body line starts at the same x. */
export const toolKeyColumn = (t: AdwaitaTheme): StyleDesc => ({
  width: t.type.caption * 7.5,
  flexShrink: 0,
  fontFamily: t.type.fontFamilyMono,
  pointerEvents: "none",
});

/** A tool's own body column: gapped, and sized by its rows rather than by the space left in the log. */
export const toolBodyStack = (t: AdwaitaTheme): StyleDesc => ({
  ...toolGapColumn(t),
  flexShrink: 0,
});

/** Growing mono text — a path, a line range, a token count. */
export const toolMonoGrow = (t: AdwaitaTheme): StyleDesc => ({
  flexShrink: 1,
  minWidth: 0,
  fontFamily: t.type.fontFamilyMono,
});

/** How wide a meter track is, and how far its score fills it. */
export const METER_TRACK_WIDTH = 84;

export const meterFill = (meter: ToolRowMeter): number => {
  if (meter.worst <= 0) return 0;
  return Math.max(3, Math.round(Math.min(1, meter.score / meter.worst) * METER_TRACK_WIDTH));
};
