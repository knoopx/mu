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
import {
  CHIP_PAD,
  HAIRLINE,
  MARK_HANG,
  METER_MIN_FILL,
  METER_TRACK_REMAINDER,
  METER_TRACK_WIDTH,
  badgeWidth,
  figureGap,
  idColumn,
  monoTextWidth,
} from "./tokens";
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

/**
 * A titled group of rows inside one call's answer: findings the view splits
 * into categories (a surface, its hotspots, its clones) wear one head each.
 */
export interface ToolPaintSection {
  title: string;
  rows: readonly ToolPaintRow[];
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

/** An id column's own ink, so a column is measured on what is drawn and never
 *  on the raw id behind it — a cut id prints its ellipsis too. */
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
  paddingLeft: t.space.xs + CHIP_PAD,
  paddingRight: t.space.xs + CHIP_PAD,
  paddingTop: CHIP_PAD,
  paddingBottom: CHIP_PAD,
  borderRadius: t.radius.sm,
  borderWidth: HAIRLINE,
  borderColor: t.color.divider.faint,
  backgroundColor: t.color.surface.button,
  flexShrink: 0,
});

/**
 * The columns a list of rows reserves for the figures its rows trail. A badge
 * hugs its own word and a meter is only there on the rows that carry a score,
 * so a column that exists on some rows and not others is the same column at a
 * different x — the list decides the columns once, over every row it holds,
 * and each row stands a slot in each of them whether or not it has anything to
 * put there.
 */
export interface ToolRowFigureColumns {
  /** The id column, measured off the widest id the list holds. */
  id: number;
  meter: number;
  trailing: number;
  badge: number;
}

/**
 * The columns a list of rows needs, measured off the widest thing each column
 * holds. The trailing figure is a set of numbers, so it is budgeted in the mono
 * it is drawn in — a proportional budget leaves the widest figure spilling out
 * of its column and the column below it out of step.
 */
export function figureColumnsOf(
  rows: readonly ToolPaintRow[],
  t: AdwaitaTheme,
): ToolRowFigureColumns {
  let idChars = 0;
  let badgeChars = 0;
  let trailingChars = 0;
  let meter = 0;
  for (const row of rows) {
    idChars = Math.max(idChars, toolIdText(row.key).trim().length);
    badgeChars = Math.max(badgeChars, row.badge.trim().length);
    trailingChars = Math.max(trailingChars, (row.trailing ?? "").trim().length);
    if (row.meter !== null && row.meter !== undefined) meter = METER_TRACK_WIDTH;
  }
  return {
    id: idColumn(t, idChars),
    meter,
    trailing: trailingChars === 0 ? 0 : monoTextWidth(t, trailingChars, t.type.micro),
    badge: badgeChars === 0 ? 0 : badgeWidth(t, badgeChars),
  };
}

/** The cluster of figures one row trails: its own gap, tighter than the row's,
 *  so a meter, a count and a badge read as one group rather than loose ink. */
export const toolFigureRow = (t: AdwaitaTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: figureGap(t),
  flexShrink: 0,
});

/**
 * One figure's column: a fixed width, and the ink pinned to one named edge of
 * it. A meter grows from the column's start, so every bar in a list opens at the
 * same x and the only thing that moves is where it stops; a count or a pill reads
 * against the column's end, so a column of words of different lengths keeps one
 * edge instead of a ragged one. A slot that names no edge lets the word decide
 * the column, and the column of every row under it moves with it.
 */
export type ToolFigureAlign = "start" | "end";

export const toolFigureSlot = (
  width: number,
  align: ToolFigureAlign = "start",
): StyleDesc => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: align === "end" ? "flex-end" : "flex-start",
  width,
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
    // The fill bleeds to the mark gutter, so the mark a row leads with sits
    // inside the highlight rather than outside it.
    marginLeft: -MARK_HANG,
    marginRight: -t.space.sm,
    paddingLeft: MARK_HANG,
    paddingRight: t.space.sm,
    borderRadius: t.radius.sm,
    borderTopWidth: first ? 0 : HAIRLINE,
    // A rule over the log's own surface takes the default divider: `faint` is
    // the nightsky window colour, so a faint rule there draws nothing.
    borderColor: t.color.divider.default,
    hover: { backgroundColor: rowHoverBg(t) },
  };
  return pressable
    ? { ...row, active: { backgroundColor: t.color.surface.active } }
    : row;
}

/** The id column: the width the list measured for its own ids, so every body
 *  line of that list starts at the same x and no more than the widest id in it
 *  is ever reserved. */
export const toolKeyColumn = (t: AdwaitaTheme, width: number): StyleDesc => ({
  width,
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

/** How far a score fills its meter track — never a sliver too thin to see, and
 *  never the whole plate, so the plate stays the thing the bar is measured by. */
export const meterFill = (meter: ToolRowMeter): number => {
  if (meter.worst <= 0) return 0;
  const room = METER_TRACK_WIDTH - METER_TRACK_REMAINDER;
  return Math.min(
    room,
    Math.max(
      METER_MIN_FILL,
      Math.round(Math.min(1, meter.score / meter.worst) * room),
    ),
  );
};
