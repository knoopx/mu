/**
 * What the figures plugin shares: the tool names a user's guardrail rule points
 * at, the bounds a plot lives inside, and the geometry of the canvas adwaita
 * draws on.
 */

export const CHART_RENDER_TOOL = "chart-render";

export const CHART_TOOL_LABEL = "Chart";

/**
 * These names are what a guardrail rule and a story point at, so they are never
 * renamed or aliased.
 */
export const FIGURE_TOOL_NAMES: readonly string[] = [CHART_RENDER_TOOL];

/**
 * How many points a plot holds.
 *
 * A bar is a flex child of the row it stands in, so past a few dozen bars the
 * picture stops being a picture and becomes a texture. The cap is what makes the
 * tool answer say "group these yourself" instead of drawing a comb.
 */
export const MAX_POINTS = 64;

/** How many series one plot carries: adwaita's series ramp is this long. */
export const MAX_SERIES = 8;

/** How many of the plotted points are read back to the model as figures. */
export const MAX_READOUT_POINTS = 24;

/** An axis label longer than this is clipped: it is a tick, not a sentence. */
export const MAX_LABEL_CHARS = 24;

/** The plot box the height parameter is bounded to, in px. */
export const MIN_PLOT_HEIGHT = 72;
export const MAX_PLOT_HEIGHT = 360;

/** A plot's geometry: the box adwaita draws in, and the width a line's canvas is laid out at. */
export const CHART_HEIGHT = 168;
export const CHART_SPARK_HEIGHT = 128;
export const CHART_CANVAS_WIDTH = 560;
