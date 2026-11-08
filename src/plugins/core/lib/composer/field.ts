import { type AdwaitaTheme } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";
import { composerFieldSize, fieldLineBox, fieldPadY } from "./fieldRows";
import { panelInset } from "./chrome";
import { ROW_HEIGHT } from "../ui/tokens";

/**
 * The draft field every panel of the composer slot types into — the composer's
 * own, the question panel's filter and its free-form answer.
 *
 * It starts at the same column as a row's label (`panelInset`) and breathes by
 * `fieldPadY`, the one measure that centres one line of it in a `ROW_HEIGHT`
 * row. A field of several rows keeps that same breathing: the pad belongs to the
 * field, not to how many rows it happens to hold.
 */

/** The row the field stands in: the field, and the meta beside it. */
export function composerFieldRow(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    alignContent: "center",
    alignSelf: "stretch",
    gap: t.space.md,
    minHeight: ROW_HEIGHT,
    flexShrink: 0,
    minWidth: 0,
  };
}

export function composerFieldStyle(t: AdwaitaTheme): StyleDesc {
  return {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    lineHeight: fieldLineBox(t),
    paddingLeft: panelInset(t),
    paddingTop: fieldPadY(t),
    paddingBottom: fieldPadY(t),
    fontSize: composerFieldSize(t),
    fontFamily: t.type.fontFamily,
    color: t.color.text.primary,
    backgroundColor: "transparent",
    borderWidth: 0,
  };
}

/** A field of exactly one line: `fieldPadY` centres it in a row's height. */
export function composerFieldLineStyle(t: AdwaitaTheme): StyleDesc {
  return {
    ...composerFieldStyle(t),
    height: ROW_HEIGHT,
    minHeight: ROW_HEIGHT,
  };
}

/** A field that grows with its text: the same pad, no fixed height. */
export function composerFieldBox(t: AdwaitaTheme): StyleDesc {
  return composerFieldStyle(t);
}
