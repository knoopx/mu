import { isDarkScheme, type AdwaitaTheme } from "adwaita-gpuix";
import type { GpuixTheme, StyleDesc } from "@gpuix/react";

function rgbTriplet(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = rgbTriplet(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

export function mixHex(a: string, b: string, weight: number): string {
  const w = Math.max(0, Math.min(1, weight));
  const [ar, ag, ab] = rgbTriplet(a);
  const [br, bg, bb] = rgbTriplet(b);
  const chan = (av: number, bv: number) =>
    Math.round(av + (bv - av) * w)
      .toString(16)
      .padStart(2, "0");
  return `#${chan(ar, br)}${chan(ag, bg)}${chan(ab, bb)}`;
}

const MUTED_RAISE = 0.45;

const MUTED_CHIP_RAISE = 0.75;

const TINT_WEIGHT = 0.22;

export function mutedText(t: AdwaitaTheme): string {
  return mixHex(t.color.text.dim, t.color.text.primary, MUTED_RAISE);
}

function toneHue(t: AdwaitaTheme, tone: ComposerTone): string | null {
  if (tone === "confirm") return t.color.functional.destructive;
  if (tone === "awaiting") return t.color.accent.base;
  return null;
}

export function tinted(
  t: AdwaitaTheme,
  base: string,
  tone: ComposerTone,
): string {
  const hue = toneHue(t, tone);
  return hue === null ? base : mixHex(base, hue, TINT_WEIGHT);
}

export function tintedMuted(
  t: AdwaitaTheme,
  tone: ComposerTone = "idle",
): string {
  return tinted(t, mutedText(t), tone);
}

export function tintedChipText(t: AdwaitaTheme, tone: ComposerTone): string {
  return tinted(
    t,
    mixHex(t.color.text.dim, t.color.text.primary, MUTED_CHIP_RAISE),
    tone,
  );
}

export function tintedFill(t: AdwaitaTheme, tone: ComposerTone): string {
  return tinted(t, t.color.surface.button, tone);
}

export function tintedBorder(t: AdwaitaTheme, tone: ComposerTone): string {
  return tinted(t, t.color.border.default, tone);
}

export function tintedDivider(t: AdwaitaTheme, tone: ComposerTone): string {
  return tinted(t, t.color.divider.default, tone);
}

export function tintedHover(t: AdwaitaTheme, tone: ComposerTone): string {
  return tinted(t, t.color.surface.hover, tone);
}

export function panelFill(t: AdwaitaTheme): string {
  return t.color.surface.headerbar;
}

export function paneFill(t: AdwaitaTheme): string {
  return t.color.surface.headerbar;
}

function cardFill(t: AdwaitaTheme): string {
  return t.color.surface.view;
}

export function bandFill(t: AdwaitaTheme): string {
  return t.color.surface.card;
}

export function userBandFill(t: AdwaitaTheme): string {
  return isDarkScheme(t.scheme)
    ? t.color.selection.muted
    : t.color.selection.faint;
}

export type ComposerTone = "idle" | "awaiting" | "confirm";

export function composerFill(
  t: AdwaitaTheme,
  tone: ComposerTone = "idle",
): string {
  if (tone === "confirm") return t.color.functional.destructiveTint;
  if (tone === "awaiting") return t.color.accent.tint;
  return t.color.surface.view;
}

export function buildNativeTheme(
  t: AdwaitaTheme,
  tone: ComposerTone = "idle",
): GpuixTheme {
  const c = t.color;
  const chart = c.chart.series;
  const type = t.type;
  const text = {
    micro: type.micro,
    small: type.caption,
    body: type.body,
    title: type.title4,
    title1: type.title1,
    title2: type.title2,
    title3: type.title3,
    title4: type.title4,
  };
  const space = {
    xs: t.space.xs,
    sm: t.space.sm,
    md: t.space.md,
    lg: t.space.lg,
    xl: t.space.xl,
  };
  const radius = {
    xs: t.radius.xs,
    sm: t.radius.sm,
    md: t.radius.md,
  };

  const mdLineHeight = Math.round(text.body * 1.55);
  const mdHeadingSizes = [text.title1, text.title2, text.title3, text.title4];
  const mdHeadingLineHeights = mdHeadingSizes.map((size) =>
    Math.max(mdLineHeight, Math.round(size * 1.3)),
  );

  return {
    appearance: isDarkScheme(t.scheme) ? "dark" : "light",
    bg: c.surface.window,
    border: tintedBorder(t, tone),
    text: c.text.primary,
    textMuted: tintedMuted(t, tone),
    textFaint: tintedMuted(t, tone),
    textDim: tintedMuted(t, tone),
    accent: c.accent.base,
    caret: c.accent.base,
    codeText: tone === "idle" ? c.text.secondary : tintedChipText(t, tone),
    codeWash: tone === "idle" ? panelFill(t) : tintedFill(t, tone),
    diffAdd: c.functional.successTint,
    diffDel: c.functional.destructiveTint,
    diffHunkBg: panelFill(t),
    fontSans: type.fontFamily,
    fontMono: type.fontFamilyMono,
    syntax: {
      comment: tintedMuted(t, tone),
      keyword: c.accent.base,
      string: c.functional.success,
      stringSpecial: c.functional.success,
      escape: c.functional.warning,
      number: c.functional.warning,
      boolean: c.functional.warning,
      typeName: chart[4],
      typeBuiltin: chart[4],
      constructor: chart[4],
      function: chart[0],
      functionBuiltin: chart[0],
      macroName: chart[1],
      property: c.text.primary,
      constant: c.functional.warning,
      variable: c.text.primary,
      variableSpecial: tintedMuted(t, tone),
      parameter: c.text.primary,
      operator: c.text.primary,
      punctuation: c.text.primary,
      tag: chart[1],
      attribute: chart[0],
      label: tintedMuted(t, tone),
      invalid: c.functional.destructive,
    },
    metrics: {
      codeTextSize: text.small,
      codeLineHeight: Math.round(text.small * 1.6),
      diffTextSize: text.small,
      diffLineHeight: Math.round(text.small * 1.6),
      mdTextSize: text.body,
      mdLineHeight,
      mdBlockGap: space.md,
      mdHeadingSizes,
      mdHeadingLineHeights,
      mdCodePaddingX: space.md,
      mdCodePaddingY: space.sm,
      mdCodeHeaderPaddingY: space.xs,
      mdCodeHeaderTextSize: text.micro,
      mdTableCellPadding: space.sm,
      mdTableMinColumnWidth: space.xl * 4,
      mdTableMinColumnContent: space.md * 4,
      mdInlineCodeRadius: radius.xs,
      mdCodeRadius: radius.md,
    },
  };
}

function overlayStyle(
  t: AdwaitaTheme,
  paddingX: number,
  paddingY: number,
): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    paddingLeft: paddingX,
    paddingRight: paddingX,
    paddingTop: paddingY,
    paddingBottom: paddingY,
    borderRadius: t.radius.xl,
    borderWidth: 0,
    overflow: "hidden",
    backgroundColor: t.color.surface.headerbar,
    boxShadow: {
      offsetX: 0,
      offsetY: 8,
      blurRadius: 24,
      spreadRadius: -6,
      color: "rgba(0,0,0,0.55)",
    },
  };
}
