/**
 * What the figures plugin shares: the tool names a user's guardrail rule points
 * at, the bounds a plot, a tree and a table live inside, and the geometry of the
 * canvas adwaita draws on.
 */

export const CHART_RENDER_TOOL = "chart-render";
export const TREE_RENDER_TOOL = "tree-render";
export const TABLE_RENDER_TOOL = "table-render";

export const CHART_TOOL_LABEL = "Chart";
export const TREE_TOOL_LABEL = "Tree";
export const TABLE_TOOL_LABEL = "Table";

/**
 * These names are what a guardrail rule and a story point at, so they are never
 * renamed or aliased.
 */
export const FIGURE_TOOL_NAMES: readonly string[] = [
  CHART_RENDER_TOOL,
  TREE_RENDER_TOOL,
  TABLE_RENDER_TOOL,
];

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

/** A name longer than this is clipped: it is a name, not a sentence. */
export const MAX_NAME_CHARS = 60;

/* Tables ----------------------------------------------------------------- */

/**
 * How many rows a table holds, and how wide its header is.
 *
 * A table of sixty rows is already taller than the window, and the log scrolls
 * past them one at a time; past that the call should be grouping, not listing.
 */
export const MAX_ROWS = 60;
export const MAX_COLUMNS = 12;

/** How many of its rows the answer reads back as an aligned table. */
export const MAX_TABLE_ROWS = 30;

/** A cell longer than this is clipped: a table cell is a word, not a clause. */
export const MAX_CELL_CHARS = 60;

/* Plot geometry ------------------------------------------------------------ */

/** A plot's geometry: the box adwaita draws in, and the width a line's canvas is laid out at. */
export const CHART_HEIGHT = 168;
export const CHART_SPARK_HEIGHT = 128;
export const CHART_CANVAS_WIDTH = 560;
