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

/**
 * A column of `chars` monospace characters: a *budget*, one character-unit per
 * unit of the caption measure, so a column of ids stays one column whatever the
 * mono font's own advance turns out to be. `monoTextWidth` is the other measure
 * — what those characters actually print — and a row that has to fit its figures
 * inside a column sizes the text with that. Two files spelling one column with
 * the budget and another one's text with the same budget is how they drift.
 */
export const monoColumn = (t: AdwaitaTheme, chars: number): number =>
  t.type.caption * chars;

/** How far one monospace character advances, as a fraction of the size it is set at. */
const MONO_ADVANCE = 0.6;

/** What `chars` monospace characters print at `size`. */
export const monoTextWidth = (
  t: AdwaitaTheme,
  chars: number,
  size: number = t.type.caption,
): number => Math.round(chars * size * MONO_ADVANCE);

/**
 * The id column a list of rows opens with, measured off the widest id that list
 * actually holds and in the mono it is drawn in — the same measure
 * `figureColumnsOf` budgets a trailing figure with, so the two columns of a row
 * cannot drift. A column fixed at the worst id the log could ever draw put an
 * eleven-step plan's `1` in eighty pixels of nothing: the column belongs to the
 * list, so the list's own ids are what size it, and every body line under it
 * still begins at one x.
 */
export const idColumn = (t: AdwaitaTheme, chars: number): number =>
  chars <= 0 ? 0 : monoTextWidth(t, chars, t.type.caption);

/** A sub-line's indent: past its list's id column and the gap between columns. */
export const subLineIndent = (t: AdwaitaTheme, keyWidth: number): number =>
  keyWidth + t.space.md;

/** How far one character of the app's *proportional* text advances, as a
 *  fraction of the size it is set at — the sibling of `MONO_ADVANCE`, and
 *  measured off the app's own badges (the pill for "moderate" prints 63px at
 *  the micro measure for eight characters). A budget, not a promise: a column
 *  sized with it stays a column whatever the font's own advance turns out to be. */
const PROPORTIONAL_ADVANCE = 0.62;

/** adwaita's own inline padding inside a small badge — 6 on each side, so a
 *  badge is wider than the word it holds by exactly this. */
const BADGE_INLINE_PAD = 12;

/** What `chars` of proportional text print at `size`. */
export const textWidth = (
  t: AdwaitaTheme,
  chars: number,
  size: number = t.type.micro,
): number => Math.round(chars * size * PROPORTIONAL_ADVANCE);

/** How wide a small badge reading `chars` characters is — the word plus the
 *  pill's own padding. A row's state column is sized with this so a longer
 *  word cannot drag the figures beside it out of line. */
export const badgeWidth = (t: AdwaitaTheme, chars: number): number =>
  textWidth(t, chars) + BADGE_INLINE_PAD;

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

/** The mark set inside a line of caption text: a picker's row, a retry. */
export const INLINE_GLYPH = CONTROL.navIconSize;

/**
 * The mark every row of the log carries: the tool header's glyph, a running
 * tool's spinner, a note's icon, a system row's mark. adwaita's `Tool` header
 * draws its glyph at this size (`GUTTER_GLYPH` in its own file, which it does
 * not export), so a log mark and a header glyph are the same mark by number.
 */
export const STATE_GLYPH = 16;

/**
 * How far the header's glyph hangs into the page inset (`GUTTER_GLYPH_HANG` =
 * glyph + gap in adwaita's `Tool`). Every mark in the log hangs this far too,
 * so the marks of a header, a running line and a note stand in one column.
 */
/** The air between that glyph and the text it stands beside. */
const GUTTER_GAP = 8;

export const MARK_HANG = STATE_GLYPH + GUTTER_GAP;

/** A mark a pointer takes: a row's action, a dialog's heading. */
export const ACTION_GLYPH = CONTROL.rowActionIconSize;

/** A mark sized to the line of text it stands beside, so the two share a baseline. */
export const glyphForText = (textSize: number): number =>
  Math.round(textSize * 0.92);

/* Gaps -----------------------------------------------------------------
 *
 * A scale says how big a step is, not which step a *role* takes. These are the
 * roles mu repeats across files, so one cluster is one gap everywhere rather
 * than one gap per file. */

/**
 * The air between the figures one row trails — a count with its histogram, a
 * size beside a label, an age beside a path — so a cluster reads as one group
 * rather than as loose text. Every plugin that trails a cluster takes this one.
 */
export const figureGap = (t: AdwaitaTheme): number => t.space.sm;

/* Rules, meters, dots -------------------------------------------------- */

/** A hairline: a divider between rows, a panel's rule, a thumbnail's edge. */
export const HAIRLINE = CONTROL.dividerThickness;

/** A score's meter: how wide its track is, and the rule that fills it. The rule
 *  is a pill, so its radius is half its height rather than a second number. */
export const METER_TRACK_WIDTH = 96;
export const METER_RULE_HEIGHT = 10;
export const METER_RULE_RADIUS = METER_RULE_HEIGHT / 2;

/** The least a meter shows of a non-zero score, so a small finding is still visible. */
export const METER_MIN_FILL = 6;

/** How much of the plate the fullest bar leaves showing. A bar that covers its
 *  track entirely has no edge left to measure itself against, so the run's worst
 *  score reads as a bar of no particular length; two pixels of plate is the
 *  scale's own granularity, well under one point of score. */
export const METER_TRACK_REMAINDER = 2;

/** A dot that carries a colour role inside a line of text — a language, a state. */
export const STATUS_DOT = 8;
export const STATUS_DOT_RADIUS = STATUS_DOT / 2;

/** The frame a previewed image is drawn in: twice a media tile, so a picture reads in the log without opening it. */
export const PREVIEW_IMAGE_WIDTH = CONTROL.mediaTileWidth * 2;
export const PREVIEW_IMAGE_HEIGHT = CONTROL.mediaTileHeight * 2;

/* Chips and pills ------------------------------------------------------ */

/** The air inside a chip: the flat sliver above and below its label, and the same
 *  sliver added to the gap the chip already sits in on its sides. A chip is a
 *  tight box, not a padded row, and it pads itself with one measure. */
export const CHIP_PAD = 2;

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
