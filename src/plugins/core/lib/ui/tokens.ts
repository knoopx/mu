/**
 * mu's design tokens: how big, how much space, how much leading, how heavy.
 *
 * Colour answers in ./theme.ts and the shape of a row in ./toolRows.ts, so what
 * lives here is only the numbers a component would otherwise hand-write. Each
 * one answers a question the app asks in more than one place — how tall a row
 * is, how wide an id column, what leading a caption wears — and says what it is
 * measured in, so one edit moves every screen at once. Where adwaita's scale
 * already owns the value this only names the role it plays here; where mu is the
 * only one who knows the number (a meter's rule, an overlay's drop, a pill's
 * height) it is written once, with the reason for it on the line above.
 */

import { CONTROL, type AdwaitaTheme } from "adwaita-gpuix";

/* The row rhythm ------------------------------------------------------- */

/**
 * One line of a list. The session tree, a project's change feed and a vcs
 * picker all row to this, so a panel of one-line rows reads as one table
 * whichever screen it is on. It is adwaita's list rhythm, named here so a
 * component never reaches past the theme for `control.rowHeight`.
 */
export const ROW_HEIGHT = CONTROL.rowHeight;

/* Columns of monospace text -------------------------------------------- */

/** How wide the id column is, in monospace character-widths at the caption measure. */
const ID_COLUMN_CHARS = 7.5;

/** A column of `chars` monospace characters, measured at the caption size. */
export const monoColumn = (t: AdwaitaTheme, chars: number): number =>
  t.type.caption * chars;

/**
 * The id column a tool row and a revision row both open with, so every body
 * line in the log begins at the same x whatever drew it.
 */
export const idColumn = (t: AdwaitaTheme): number =>
  monoColumn(t, ID_COLUMN_CHARS);

/** A sub-line's indent: past its parent's id column and the gap between columns. */
export const subLineIndent = (t: AdwaitaTheme): number =>
  idColumn(t) + t.space.md;

/* Leading -------------------------------------------------------------- */

/**
 * adwaita's `TYPE.lineHeight` keeps a text role at its own size, which is right
 * for a control's label and far too tight for a block of prose or a page of a
 * preview. mu's rhythm is looser, and it is stated once, per role.
 */
const LEADING = { body: 1.5, caption: 1.6, micro: 1.6 } as const;

/** How much bigger than its own line box a heading still has to be. */
const HEADING_LEADING = 1.3;

export type TextRole = keyof typeof LEADING;

/** The leading ratio of a role, for a caller that sets a ratio rather than a line box. */
export const leadingOf = (role: TextRole): number => LEADING[role];

/** The height one line of `role` text set at `size` takes. */
export const lineBoxAt = (
  t: AdwaitaTheme,
  role: TextRole,
  size: number,
): number => Math.round(size * LEADING[role]);

/** The line box of a text role at its own size. */
export const lineBox = (t: AdwaitaTheme, role: TextRole): number =>
  lineBoxAt(t, role, t.type[role]);

/** A heading's line box at `size` — never tighter than the body's. */
export function headingLineBox(t: AdwaitaTheme, size: number): number {
  return Math.max(lineBox(t, "body"), Math.round(size * HEADING_LEADING));
}

/**
 * The line box of a block of monospace text — a file preview, a patch, the
 * draft field — at whatever size it is set in. Code wears the caption's leading.
 */
export const codeLineBox = (
  t: AdwaitaTheme,
  size: number = t.type.caption,
): number => lineBoxAt(t, "caption", size);

/* Emphasis ------------------------------------------------------------- */

/** The weight a line wears when it is the lead of its block: a tool's caption,
 *  a section's title, the row the keyboard is on. */
export const emphasisWeight = (t: AdwaitaTheme): number => t.type.weight.semibold;

/** The weight of a heading. */
export const titleWeight = (t: AdwaitaTheme): number => t.type.weight.bold;

/** The weight of text that is not emphasised — the other half of every
 *  selected/unselected pair, so a row changes weight and not just colour. */
export const plainWeight = (t: AdwaitaTheme): number => t.type.weight.regular;

/* Marks ---------------------------------------------------------------- */

/** A small mark set beside text: a tree's role icon, a warning on a feed row. */
export const MARKER_GLYPH = CONTROL.compactIconSize;

/** The mark set inside a line of caption text: a system row's icon, a picker's row, a retry. */
export const INLINE_GLYPH = CONTROL.navIconSize;

/** The glyph of a line that reports state: a running tool's spinner, a note's icon. */
export const STATE_GLYPH = 16;

/** A mark a pointer takes: a row's action, a dialog's heading. */
export const ACTION_GLYPH = CONTROL.rowActionIconSize;

/** A mark sized to the line of text it stands beside, so the two share a baseline. */
export const glyphForText = (textSize: number): number =>
  Math.round(textSize * 0.92);

/* Rules, meters, dots -------------------------------------------------- */

/** A hairline: a divider between rows, a panel's rule, a thumbnail's edge. */
export const HAIRLINE = CONTROL.dividerThickness;

/** A score's meter: how wide its track is, and the rule that fills it. The rule
 *  is a pill, so its radius is half its height rather than a second number. */
export const METER_TRACK_WIDTH = 84;
export const METER_RULE_HEIGHT = 4;
export const METER_RULE_RADIUS = METER_RULE_HEIGHT / 2;

/** The least a meter shows of a non-zero score, so a small finding is still visible. */
export const METER_MIN_FILL = 3;

/** A dot that carries a colour role inside a line of text — a language, a state. */
export const STATUS_DOT = 8;
export const STATUS_DOT_RADIUS = STATUS_DOT / 2;

/** The frame a previewed image is drawn in: twice a media tile, so a picture reads in the log without opening it. */
export const PREVIEW_IMAGE_WIDTH = CONTROL.mediaTileWidth * 2;
export const PREVIEW_IMAGE_HEIGHT = CONTROL.mediaTileHeight * 2;

/* Chips and pills ------------------------------------------------------ */

/** The air inside a chip beyond the gap the chip sits in, and the flat sliver
 *  above and below its label: a chip is a tight box, not a padded row. */
export const CHIP_INSET = 2;
export const CHIP_PAD_Y = 2;

/** A composer pill's height — and the line box of its label, which is how the
 *  label sits centred in the box without any padding arithmetic. */
export const PILL_HEIGHT = 22;

/** A colour swatch in the theme picker: wide enough to read a hue, short enough to sit in a row. */
export const SWATCH_WIDTH = 30;
export const SWATCH_HEIGHT = 18;

/* Elevation ------------------------------------------------------------ */

/**
 * The drop a floating surface carries over the log. An overlay panel and a
 * toast wear the same one, so a thing that floats above the transcript floats
 * at one height above it. The ink is a colour and answers in ./theme.ts.
 */
export const ELEVATION = {
  offsetY: 8,
  blurRadius: 24,
  spreadRadius: -6,
} as const;
