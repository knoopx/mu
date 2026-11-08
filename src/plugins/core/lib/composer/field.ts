import { type AdwaitaTheme } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";
import { composerFieldSize, fieldLineBox, fieldPadY } from "./fieldRows";
import { ROW_HEIGHT } from "../ui/tokens";

/** A field that holds several rows breathes by this fraction of its own text size. */
const FIELD_PAD_RATIO = 0.35;

export function composerFieldHeight(t: AdwaitaTheme): number {
  return t.control.deviceRowHeight;
}

export function composerFieldLineHeight(t: AdwaitaTheme): number {
  return ROW_HEIGHT;
}

export function composerFieldRow(t: AdwaitaTheme): StyleDesc {
  const height = composerFieldLineHeight(t);
  return {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.md,
    height,
    minHeight: height,
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
    fontSize: composerFieldSize(t),
    fontFamily: t.type.fontFamily,
    color: t.color.text.primary,
    backgroundColor: "transparent",
    borderWidth: 0,
  };
}

export function composerFieldLineStyle(t: AdwaitaTheme): StyleDesc {
  const height = composerFieldLineHeight(t);
  return {
    ...composerFieldStyle(t),
    lineHeight: fieldLineBox(t),
    height,
    minHeight: height,
    paddingLeft: t.space.xs,
    paddingTop: fieldPadY(t),
    paddingBottom: fieldPadY(t),
  };
}

export function composerFieldBox(t: AdwaitaTheme): StyleDesc {
  return {
    ...composerFieldStyle(t),
    lineHeight: fieldLineBox(t),
    minHeight: composerFieldHeight(t),
    paddingTop: Math.round(composerFieldSize(t) * FIELD_PAD_RATIO),
    paddingBottom: Math.round(composerFieldSize(t) * FIELD_PAD_RATIO),
  };
}
