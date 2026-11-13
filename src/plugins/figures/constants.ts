/**
 * What the figures plugin shares: the tool names a user's guardrail rule points
 * at, the bounds a plot and a tree live inside, and the geometry of the canvas
 * adwaita draws on.
 */

export const CHART_RENDER_TOOL = "chart-render";
export const TREE_RENDER_TOOL = "tree-render";

export const CHART_TOOL_LABEL = "Chart";
export const TREE_TOOL_LABEL = "Tree";

/**
 * These names are what a guardrail rule and a story point at, so they are never
 * renamed or aliased.
 */
export const FIGURE_TOOL_NAMES: readonly string[] = [
  CHART_RENDER_TOOL,
  TREE_RENDER_TOOL,
];

/**
 * How many points a plot holds.
 *
 * A bar is a flex child of the row it stands in, so past a few dozen bars the
 * picture stops being a picture and becomes a texture. The cap is what makes the
 * tool answer say "group these yourself" instead of drawing a comb.
 */
export const MAX_POINTS = 64;

/** How many series one plot carries: the ramp core builds is this long. */
export const MAX_SERIES = 8;

/** How many of the plotted points are read back to the model as figures. */
export const MAX_READOUT_POINTS = 24;

/** An axis label longer than this is clipped: it is a tick, not a sentence. */
export const MAX_LABEL_CHARS = 24;

/**
 * How many points a line may carry and still have a marker at every one.
 *
 * A marker is a dot the eye counts; past a dozen on one canvas they are a second
 * series drawn over the first, and the thing the line was showing — its shape —
 * is what gets buried. A run this short is marked whatever the caller left
 * unsaid; a longer one marks only the point it points at.
 */
export const MAX_MARKED_POINTS = 12;

/**
 * How wide one bar of a single-series bar plot is allowed to get.
 *
 * adwaita lets a bar fill its slot, so three categories across a wide panel
 * print three slabs. Past this width a bar stops reading as one of a handful of
 * comparisons and starts reading as a block with a figure on it.
 */
export const MAX_BAR_WIDTH = 24;

/** The gap adwaita stands a single-series bar plot's slots in. */
export const BAR_SLOT_GAP = 4;

/** The plot box the height parameter is bounded to, in px. */
export const MIN_PLOT_HEIGHT = 72;
export const MAX_PLOT_HEIGHT = 360;

/* Trees ------------------------------------------------------------------ */

/**
 * How many nodes a tree holds.
 *
 * A tree is drawn to be read as a shape; past eighty rows what is painted is a
 * directory listing the log has to scroll through, so the cap is what makes the
 * answer say "draw the part that carries the point" instead of all of it.
 */
export const MAX_NODES = 80;

/** How deep a tree goes before the branches below are cut. */
export const MAX_DEPTH = 10;

/** How many of its nodes the answer walks back as indented text. */
export const MAX_TREE_LINES = 40;

/**
 * A name longer than this is clipped: it is a name, not a sentence.
 *
 * It is also the measure of a value a refusal quotes back — the text that sat
 * where a name belonged is quoted to be recognised, not read.
 */
export const MAX_NAME_CHARS = 60;

/* Plot geometry ------------------------------------------------------------ */

/** A plot's geometry: the box adwaita draws in, and the width a line's canvas is laid out at. */
export const CHART_HEIGHT = 168;
export const CHART_SPARK_HEIGHT = 128;
export const CHART_CANVAS_WIDTH = 560;
