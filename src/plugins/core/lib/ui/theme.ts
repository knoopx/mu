import { isDarkScheme, type AdwaitaTheme, type KbdColors } from "adwaita-gpuix";
import type { GpuixTheme, StyleDesc } from "@gpuix/react";

import { ELEVATION, codeLineBox, headingLineBox, lineBox } from "./tokens";

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

function tinted(t: AdwaitaTheme, base: string, tone: ComposerTone): string {
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

/** The wash behind a block the log quotes: a code preview, a diff hunk. */
function panelFill(t: AdwaitaTheme): string {
  return t.color.surface.headerbar;
}

/**
 * The page the log sits on. A different role from a quoted block — the block
 * has to read as set into the page — and the same surface until a scheme says
 * otherwise.
 */
export function paneFill(t: AdwaitaTheme): string {
  return t.color.surface.headerbar;
}

/** The band a tool shows its own output in: lines read, lines written, a patch. */
export function bandFill(t: AdwaitaTheme): string {
  return t.color.surface.card;
}

export function userBandFill(t: AdwaitaTheme): string {
  return isDarkScheme(t.scheme)
    ? t.color.selection.muted
    : t.color.selection.faint;
}

/* The series ramp -------------------------------------------------------
 *
 * A plot with several series on it has to say which one the reader is looking
 * at. adwaita's categorical ramp is five unrelated hues, and eight series walk
 * it twice over: every series is loud, so none is, and the third and fourth bar
 * come back wearing `destructive` and `warning` — the two colours that mean an
 * error and a caution everywhere else in the app — as decoration. mu's ramp
 * keeps one hue and walks its lightness, then hands the tail to neutrals, so
 * the first series leads and the rest read as context. A diagram takes the same
 * ramp, which is why a pie and a bar chart in the same window still agree.
 */

/** How far one step of the ramp sits from the last, in lightness. */
const SERIES_STEP = 0.13;

/** The accent and its two lightness neighbours: the loud head of the ramp. */
const SERIES_HUE_RUN = 3;

/** The least a plot's leading series may stand out from the page it is drawn on. */
const SERIES_MIN_LEAD = 2.8;

/**
 * The quiet tail, in contrast against the page: as many steps again, each one
 * standing a little less proud than the last, for the series that are context
 * rather than the figure. Greys, not more hues — one accent per chart, and
 * everything behind it steps down the neutral ramp. The ladder is measured in
 * stand, not in mixing weights, so it reads the same height on a white page as
 * on a near-black one, and its last rung is still a mark rather than a smudge.
 */
const SERIES_QUIET_STANDS = [6.0, 4.7, 3.7, 2.9, 2.3] as const;

/** How far the hue's own steps may go before they stop being a hue. */
const SERIES_L_FLOOR = 0.16;
const SERIES_L_CEILING = 0.88;

/** A hex as hue, saturation and lightness, each normalised. */
function hslTriplet(hex: string): [number, number, number] {
  const [r, g, b] = rgbTriplet(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const span = max - min;
  const saturation = span === 0 ? 0 : span / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (span > 0) {
    if (max === r) hue = ((g - b) / span) % 6;
    else if (max === g) hue = (b - r) / span + 2;
    else hue = (r - g) / span + 4;
  }
  return [((hue + 6) % 6) * 60, saturation, lightness];
}

/**
 * Which channel takes the chroma and which the partial leg, per sector of the
 * hue wheel. A table rather than a run of tests: the sectors are the definition,
 * and reading them in order is the whole of the conversion.
 */
const HUE_SLOTS: readonly [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 2],
  [2, 1],
  [2, 0],
  [0, 2],
];

/** Hue, saturation and lightness as a hex. */
function hexFromHsl(
  hue: number,
  saturation: number,
  lightness: number,
): string {
  const l = Math.max(0, Math.min(1, lightness));
  const s = Math.max(0, Math.min(1, saturation));
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const position = (((hue % 360) + 360) % 360) / 60;
  const sector = Math.floor(position);
  // The partial leg is set by where in the sector the hue sits, not by which
  // sector it is: it grows to the chroma at the sector's far edge and falls back.
  const leg = chroma * (1 - Math.abs((position % 2) - 1));
  const channels = [0, 0, 0];
  const [chromaChannel, legChannel] = HUE_SLOTS[sector];
  channels[chromaChannel] = chroma;
  channels[legChannel] = leg;
  const match = l - chroma / 2;
  const hex = channels
    .map((v) =>
      Math.round((v + match) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
  return `#${hex}`;
}

/** The same colour, `delta` of lightness away from where it was — chroma held. */
function shiftLightness(hex: string, delta: number): string {
  const [hue, saturation, lightness] = hslTriplet(hex);
  const away = Math.max(
    SERIES_L_FLOOR,
    Math.min(SERIES_L_CEILING, lightness + delta),
  );
  return hexFromHsl(hue, saturation, away);
}

/** The relative luminance of a hex, the figure contrast is measured from. */
function luminance(hex: string): number {
  const [r, g, b] = rgbTriplet(hex)
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** How far two colours stand from each other, 1 to 21. */
function contrastRatio(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (high + 0.05) / (low + 0.05);
}

/** The same colour, stepped away from `page` until it stands `wanted` from it. */
function liftFrom(
  hex: string,
  page: string,
  wanted: number,
  step: number,
): string {
  let ink = hex;
  for (let at = 0; at < 8 && contrastRatio(ink, page) < wanted; at += 1) {
    const next = shiftLightness(ink, step);
    if (next === ink) break;
    ink = next;
  }
  return ink;
}

/** The colour between `ink` and `page` that stands `wanted` from the page. */
function mixToContrast(ink: string, page: string, wanted: number): string {
  if (contrastRatio(ink, page) <= wanted) return ink;
  let low = 0;
  let high = 0.98;
  for (let at = 0; at < 24; at += 1) {
    const middle = (low + high) / 2;
    if (contrastRatio(mixHex(ink, page, middle), page) > wanted) low = middle;
    else high = middle;
  }
  return mixHex(ink, page, (low + high) / 2);
}

/**
 * The `count` colours a multi-series figure is drawn in, in the order the
 * series take them. Fixed, never cycled from a shorter list: a ramp that runs
 * out repeats a colour, and two series wearing one colour are one series.
 *
 * The head is the accent and two lightness steps of the same hue, and the lead
 * is re-derived for the page it stands on — an accent dim enough to sink into
 * the log cannot lead a chart, and a chart whose context series shout over its
 * own figure is exactly the tell this ramp exists to kill. The tail is the
 * neutral ramp: the ink a caption is drawn in, then that ink nearer the page.
 */
export function seriesRamp(t: AdwaitaTheme, count: number): string[] {
  const page = paneFill(t);
  // One direction, and the direction away from the page: a step toward the page
  // is a series that fades before the context series start, and a step that
  // crosses it is a series drawn in the paper's own colour.
  const away = isDarkScheme(t.scheme) ? SERIES_STEP : -SERIES_STEP;
  const leadInk = liftFrom(t.color.accent.base, page, SERIES_MIN_LEAD, away);
  const loud = Array.from({ length: SERIES_HUE_RUN }, (_unused, at) =>
    at === 0 ? leadInk : shiftLightness(leadInk, away * at),
  );
  // The tail starts at the ink a caption is drawn in and steps toward the page.
  // Grey against hue is already the separation: a context series does not have
  // to be faint to read as background, and one washed to a smudge is a row of
  // the table the chart is standing in.
  const quiet = SERIES_QUIET_STANDS.map((stand) =>
    mixToContrast(t.color.text.secondary, page, stand),
  );
  return Array.from(
    { length: Math.max(0, count) },
    (_unused, at) => loud[at] ?? quiet[(at - loud.length) % quiet.length],
  );
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

  const mdLineHeight = lineBox(t, "body");
  const mdHeadingSizes = [text.title1, text.title2, text.title3, text.title4];
  const mdHeadingLineHeights = mdHeadingSizes.map((size) =>
    headingLineBox(t, size),
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
      codeLineHeight: codeLineBox(t, text.small),
      diffTextSize: text.small,
      diffLineHeight: codeLineBox(t, text.small),
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

/* The full-screen picture ------------------------------------------------
 *
 * A picture is shown on a ground of its own rather than the page's: a
 * photograph reads true against near-black whatever theme the window is
 * wearing, and words light enough to be read on that ground would vanish on a
 * light page. These are the only colours in the app that ignore the scheme, and
 * they ignore it on purpose — the ground and the ink are fixed together.
 */

/** The ground a picture is shown on, and everything that sits on it. Opaque: a
 *  ground you can read the log through is a log asking to be read again. */
export const PICTURE_GROUND = "rgba(10,10,13,1)";

/** The words that name the picture on screen. */
export const PICTURE_INK = "rgba(255,255,255,0.92)";

/** Its figures: the kind, the size, which side of a change it is. */
export const PICTURE_INK_MUTED = "rgba(255,255,255,0.6)";

/** The key caps of the picture's hint line, lifted off the ground, not inked on it. */
export const PICTURE_KEYS: KbdColors = {
  fill: "rgba(255,255,255,0.1)",
  border: "rgba(255,255,255,0.22)",
  color: PICTURE_INK,
};

/** The rule the picture's caption wears, and the box a close mark sits in. */
export const PICTURE_RULE = "rgba(255,255,255,0.16)";
export const PICTURE_HOVER = "rgba(255,255,255,0.12)";

/** The ink of a floating surface's drop, over whatever is under it. */
const ELEVATION_INK = "rgba(0,0,0,0.55)";

/** The shadow every surface that floats above the log wears, at one height. */
export function elevatedShadow(): NonNullable<StyleDesc["boxShadow"]> {
  return { offsetX: 0, ...ELEVATION, color: ELEVATION_INK };
}
