import { useAdwaita, type AdwaitaTheme } from "adwaita-gpuix";
import { type JSX } from "react";
import {
  type LinearGradientBackground,
  type LinearGradientStop,
  type StyleDesc,
} from "@gpuix/react";
import { withAlpha, mutedText } from "../../lib/ui/theme";
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
export const CONTEXT_RING_FADE = 0.1;

export const CONTEXT_WARN_FRACTION = 0.7;
export const CONTEXT_DANGER_FRACTION = 0.9;

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
  total > 0 ? Math.max(0, Math.min(1, used / total)) : 0;

export const contextRingColor = (t: AdwaitaTheme, fraction: number): string =>
  fraction >= CONTEXT_DANGER_FRACTION
    ? t.color.functional.destructive
    : fraction >= CONTEXT_WARN_FRACTION
      ? t.color.functional.warning
      : t.color.accent.base;

/** Where the fill ends along the gradient line. */
export const contextRingEdge = (fraction: number): number =>
  Math.max(0, Math.min(1, fraction));

/** Where that fill's fade begins: one `CONTEXT_RING_FADE` behind the edge, and
 * never before the start of the line. */
export const contextRingTail = (fraction: number): number =>
  Math.max(0, contextRingEdge(fraction) - CONTEXT_RING_FADE);

export const contextRingStops = (
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
