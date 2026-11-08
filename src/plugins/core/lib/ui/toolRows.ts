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

import { HAIRLINE } from "./tokens";

/** Text in a line: it gives way, but never below what it has to show. */
export const toolGrow: StyleDesc = { flexShrink: 1, minWidth: 0 };

/** The column a tool result is stacked down, its rows carrying their own gaps. */
export function toolColumn(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    paddingLeft: t.space.sm,
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

/** One line of a tool result: its parts in a row, spaced and padded by the theme. */
export function toolLine(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.sm,
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

/** One cell of a table of rows, divided from the one above it unless it is first. */
export function toolCell(t: AdwaitaTheme, first: boolean): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    borderTopWidth: first ? 0 : HAIRLINE,
    borderColor: t.color.divider.faint,
    minWidth: 0,
    flexShrink: 0,
  };
}

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
