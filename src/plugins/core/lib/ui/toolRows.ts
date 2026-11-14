/**
 * The row shapes every tool result is painted from.
 *
 * A tool row in the log is a padded column of lines, sometimes divided into
 * cells of a table, and each of those shapes is the same handful of theme
 * tokens wherever a plugin draws one. They live in one file so a plugin's row
 * is the object the log already knows, and so a spacing change is one edit.
 * Nothing here knows a tool: the parts that do stay in their plugin.
 */

import { type AdwaitaTheme } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import { HAIRLINE, MARK_HANG, lineBox } from "./tokens";

/** Text in a line: it gives way, but never below what it has to show. */
export const toolGrow: StyleDesc = { flexShrink: 1, minWidth: 0 };

/**
 * The text of a log line, on the log's own leading.
 *
 * A caption, a note and a section head are all caption text, and a preview
 * line already wears `previewLineHeight`; without this the rows of an answer
 * sit tighter than the prose above them and the log has two rhythms.
 */
export const toolText = (t: AdwaitaTheme): StyleDesc => ({
  ...toolGrow,
  lineHeight: lineBox(t, "caption"),
});

/**
 * A mark hung into the page inset, so every mark in the log stands in the
 * column the tool header's glyph hangs in.
 *
 * `columnPadding` is the left padding of the column the line sits in. The
 * log's columns open flush with the inset (see `toolColumn`), so the usual call
 * passes nothing; a row nested inside a padded sub-column passes that padding
 * so its mark still reaches the same x.
 */
export const toolMark: StyleDesc = {
  flexShrink: 0,
  marginLeft: -MARK_HANG,
};

/** A mark in a column that pads its own left edge: it clears that padding too,
 *  so the mark still reaches the header's column instead of a second one. */
export const toolMarkIn = (columnPadding: number): StyleDesc => ({
  ...toolMark,
  marginLeft: -(MARK_HANG + columnPadding),
});

/**
 * The column a tool result is stacked down, its rows carrying their own gaps.
 *
 * It opens flush with the page inset: the text of an answer then starts at the
 * same x as the tool header's title, and its marks hang into the inset beside
 * it (see `toolMark`). A column that padded its own left edge put every body
 * line a space to the right of the head it answers.
 */
export function toolColumn(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    paddingLeft: 0,
    paddingRight: t.space.sm,
    minWidth: 0,
    flexShrink: 1,
  };
}

/** The same column with the theme's gap between its parts. */
export function toolGapColumn(t: AdwaitaTheme): StyleDesc {
  return {
    ...toolColumn(t),
    gap: t.space.xs,
  };
}

/**
 * One line of a tool result: its parts in a row, spaced and padded by the
 * theme. It is never shorter than a line of caption text, so a mark does not
 * stretch one row and leave the rows above and below it on a different pitch.
 */
export function toolLine(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.sm,
    minHeight: lineBox(t, "caption"),
    paddingTop: t.space.xs,
    paddingBottom: t.space.xs,
    minWidth: 0,
    flexShrink: 0,
  };
}

/** The same line without vertical padding, for a block already gapped by its column. */
export function toolLineFlush(t: AdwaitaTheme): StyleDesc {
  return {
    ...toolLine(t),
    paddingTop: 0,
    paddingBottom: 0,
  };
}

/** One cell of a table of rows, divided from the one above it unless it is first.
 *  The rule is the default divider because a cell sits on the log's own surface,
 *  where `faint` is that surface's colour and draws nothing. */
export function toolCell(t: AdwaitaTheme, first: boolean): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    borderTopWidth: first ? 0 : HAIRLINE,
    borderColor: t.color.divider.default,
    minWidth: 0,
    flexShrink: 0,
  };
}

/**
 * A row's text is one line, and a cut is marked.
 *
 * A row of a table is one line of text. A line that wraps makes that row taller
 * than its neighbours, drops its figures out of the row's pitch and gives the
 * whole table two rhythms, so wrapping is off here and the engine truncates with
 * its own ellipsis. That also puts the cut at the column's real right edge: a
 * wrapped line stops at whatever width an earlier pass settled on, which is how a
 * title was seen to break a couple of hundred pixels short of the space it had.
 */
/** The half of `toolOneLine` that is not about growing: text stays on one line
 *  and the ellipsis marks where the box cut it. A column the list already
 *  measured takes this and keeps its own width — a box narrower than its ink
 *  would otherwise break its text onto a second line and make that row taller
 *  than its neighbours. */
export const toolEllipsis: StyleDesc = {
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

export const toolOneLine: StyleDesc = {
  ...toolGrow,
  ...toolEllipsis,
};

/** The same line in mono — a path, a hash, a set of figures. */
export const toolMonoOneLine = (t: AdwaitaTheme): StyleDesc => ({
  ...toolOneLine,
  fontFamily: t.type.fontFamilyMono,
});

/** The body of a data row: it takes the width the id column and the badge leave. */
export const toolBodyColumn: StyleDesc = {
  display: "flex",
  flexDirection: "column",
  gap: 0,
  flexGrow: 1,
  flexBasis: 0,
  minWidth: 0,
  pointerEvents: "none",
};
