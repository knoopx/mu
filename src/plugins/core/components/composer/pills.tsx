import { useAdwaita, type AdwaitaTheme } from "adwaita-gpuix";
import { type JSX } from "react";
import {
  type LinearGradientBackground,
  type LinearGradientStop,
  type StyleDesc,
} from "@gpuix/react";
import { clamp } from "../../../../utils/clamp";
import { mixHex, mutedText, withAlpha } from "../../lib/ui/theme";
import { PILL_HEIGHT } from "../../lib/ui/tokens";

const PILL_LABEL_MAX_WIDTH = 240;

export const CONTEXT_RING_WIDTH = 1;

const CONTEXT_RING_ANGLE = 90;

/** The soft leading edge of the fill, as a share of the box's width.
 *
 * What has been travelled stays solid and only the head fades. A fade that spans
 * the whole fill dims the travelled length and leaves its end invisible, so the
 * ring reads as a fraction of the fraction and a full context still leaves the
 * finish line unpainted. */
const CONTEXT_RING_FADE = 0.1;

/** Where the ring's ink is half green and half yellow: half the context spent. */
const CONTEXT_WARN_FRACTION = 0.5;

/** And half yellow and half red: a tenth short of the whole window. */
const CONTEXT_DANGER_FRACTION = 0.9;

/** How much of the context one colour change costs, as a share of the window.
 *
 * Each functional colour is reached — and left — over this span, centred on the
 * fraction named above, so the ring never flips on one frame: it is already
 * warming at 45% and already reddening at 85%. A threshold that changes the ink
 * all at once reads as a switch that was thrown, not as a window filling up. */
const CONTEXT_BLEND_FRACTION = 0.2;

function pillBox(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    height: PILL_HEIGHT,
    paddingLeft: t.space.sm,
    paddingRight: t.space.sm,
    borderRadius: t.radius.full,
    borderWidth: 0,
    backgroundColor: pillFill(t),
    flexShrink: 1,
    minWidth: 0,
    alignSelf: "center",
    userSelect: "none",
    pointerEvents: "none",
  };
}

function pillFill(t: AdwaitaTheme): string {
  return t.color.surface.raised;
}

function pillText(t: AdwaitaTheme): StyleDesc {
  return {
    fontSize: t.type.caption,
    lineHeight: PILL_HEIGHT,
    fontFamily: t.type.fontFamily,
    color: mutedText(t),
    whiteSpace: "nowrap",
    flexShrink: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: PILL_LABEL_MAX_WIDTH,
    userSelect: "none",
  };
}

export interface ComposerPillProps {
  label: string;
}

export function ComposerPill(props: ComposerPillProps): JSX.Element {
  const t = useAdwaita();
  return (
    <div style={pillBox(t)}>
      <text style={pillText(t)}>{props.label}</text>
    </div>
  );
}

export const contextFraction = (used: number, total: number): number =>
  total > 0 ? clamp(used / total, 1) : 0;

/** Where the fill ends along the gradient line. */
const contextRingEdge = (fraction: number): number => clamp(fraction, 1);

/** How far the blend centred on `center` has travelled at `fraction`. */
const contextBlend = (fraction: number, center: number): number =>
  clamp((fraction - center) / CONTEXT_BLEND_FRACTION + 0.5, 1);

/** The ring says how much of the context is spent, so it wears the theme's three
 * functional colours rather than its accent: green while there is room, yellow
 * around half, red in the last tenth. The accent would say "the app's colour", not
 * "how close the window is to compacting".
 *
 * It blends between those three rather than picking one: the ink of a ring at 90%
 * is halfway from yellow to red, and the colour is a reading of the whole window
 * instead of which band the last token landed in. */
const contextRingColor = (t: AdwaitaTheme, fraction: number): string => {
  const spent = contextRingEdge(fraction);
  const warm = mixHex(
    t.color.functional.success,
    t.color.functional.warning,
    contextBlend(spent, CONTEXT_WARN_FRACTION),
  );
  return mixHex(
    warm,
    t.color.functional.destructive,
    contextBlend(spent, CONTEXT_DANGER_FRACTION),
  );
};

/** Where that fill's fade begins: one `CONTEXT_RING_FADE` behind the edge, and
 * never before the start of the line. */
const contextRingTail = (fraction: number): number =>
  Math.max(0, contextRingEdge(fraction) - CONTEXT_RING_FADE);

const contextRingStops = (
  t: AdwaitaTheme,
  fraction: number,
): [LinearGradientStop, LinearGradientStop] => {
  const color = contextRingColor(t, fraction);
  const clear = withAlpha(color, 0);
  const edge = contextRingEdge(fraction);
  // Both ends of the scale stay a pair of *distinct* stops: a gradient whose two
  // stops coincide has nothing to ramp between. An empty context paints nothing,
  // and a full one closes the ring in one solid ink — the finish line is the last
  // thing a fill has to reach, not the first thing a fade erases.
  if (edge <= 0)
    return [
      { color: clear, position: 0 },
      { color: clear, position: 1 },
    ];
  if (edge >= 1)
    return [
      { color, position: 0 },
      { color, position: 1 },
    ];
  return [
    { color, position: contextRingTail(fraction) },
    { color: clear, position: edge },
  ];
};

export const contextRingGradient = (
  t: AdwaitaTheme,
  fraction: number,
): LinearGradientBackground => ({
  type: "linear-gradient",
  angle: CONTEXT_RING_ANGLE,
  colorSpace: "srgb",
  stops: contextRingStops(t, fraction),
});
