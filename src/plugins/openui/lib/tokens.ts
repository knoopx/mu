/**
 * The geometry an OpenUI program is written in.
 *
 * A program picks a gap by name (`"m"`, `"xl"`), never a number, so this file
 * is the one place that says what those names are worth in pixels. The ladder
 * is capped at adwaita-gpuix's SPACE (4/8/12/16/24): nothing on a GNOME
 * surface is spaced wider than 24, and a 26/36 gap between panes is web-page
 * air — it is what makes a program read as a dashboard.
 */

import type { StyleDesc } from "@gpuix/react";

export const GAP = {
  none: 0,
  xs: 2,
  s: 6,
  m: 12,
  l: 16,
  xl: 24,
  "2xl": 24,
} as const;

export type GapToken = keyof typeof GAP;
export type AlignToken = "start" | "center" | "end" | "stretch" | "baseline";
export type JustifyToken =
  | "start"
  | "center"
  | "end"
  | "between"
  | "around"
  | "evenly";
export type ToneToken =
  | "default"
  | "muted"
  | "accent"
  | "success"
  | "warning"
  | "destructive";

const ALIGN: Record<AlignToken, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline",
};

const JUSTIFY: Record<JustifyToken, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
  evenly: "space-evenly",
};

/** The gap names a program may pass. */
export const GAP_TOKENS = [
  "none",
  "xs",
  "s",
  "m",
  "l",
  "xl",
  "2xl",
] as const;

/** The cross-axis names a program may pass. */
export const ALIGN_TOKENS = [
  "start",
  "center",
  "end",
  "stretch",
  "baseline",
] as const;

/** The main-axis names a program may pass. */
export const JUSTIFY_TOKENS = [
  "start",
  "center",
  "end",
  "between",
  "around",
  "evenly",
] as const;

/** The colour roles a program may name; `lib/theme.ts` says what they are. */
export const TONE_TOKENS = [
  "default",
  "muted",
  "accent",
  "success",
  "warning",
  "destructive",
] as const;

export function gapPx(gap?: string | null): number {
  return GAP[(gap ?? "m") as GapToken] ?? GAP.m;
}

/**
 * The flex style one container's props turn into. The cross axis defaults to
 * stretch because GPUI centres cross-axis children when it is left unset, so a
 * pane asked to sit beside a taller sibling would float into the middle of the
 * log.
 */
export function flexStyle(opts: {
  direction?: string | null;
  gap?: string | null;
  align?: string | null;
  justify?: string | null;
  wrap?: boolean | null;
  grow?: number | boolean | null;
}): StyleDesc {
  const style: StyleDesc = {
    display: "flex",
    flexDirection: opts.direction === "row" ? "row" : "column",
    gap: gapPx(opts.gap),
    alignItems: ALIGN[(opts.align ?? "stretch") as AlignToken] ?? "stretch",
  };
  if (opts.justify)
    style.justifyContent = JUSTIFY[opts.justify as JustifyToken] ?? "flex-start";
  if (opts.wrap) style.flexWrap = "wrap";
  if (typeof opts.grow === "number") style.flexGrow = opts.grow;
  if (opts.grow === true) style.flexGrow = 1;
  return style;
}

/** How far a value fills its track, with no ceiling assumed. */
export function fraction(value: number, max?: number): number {
  if (!Number.isFinite(value)) return 0;
  const top = typeof max === "number" && max > 0 ? max : value <= 1 ? 1 : 100;
  return Math.max(0, Math.min(1, value / top));
}
