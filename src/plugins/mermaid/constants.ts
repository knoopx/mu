/** What the plugin is called, and what a call is budgeted to hold. */

export const MERMAID_RENDER_TOOL = "mermaid-render";

export const MERMAID_TOOL_LABEL = "Diagram";

export const MERMAID_TOOL_NAMES: readonly string[] = [MERMAID_RENDER_TOOL];

/**
 * A diagram is a picture, not a document. Past this much source the thing stops
 * being readable as one, and Pele's own layout work grows with it.
 */
export const MAX_SOURCE_CHARS = 20_000;

/**
 * Pele's edge guard: a diagram past this is refused rather than left laying
 * itself out for a minute. It answers as a `limit` error, which is a thing the
 * model can act on by splitting the diagram.
 */
export const MAX_EDGES = 500;

/**
 * How many of the labels a diagram draws are read back to the model. The list
 * is the diagram's sentence — it is what the model checks when it cannot see
 * the picture — and a busy diagram says too much at once.
 */
export const MAX_LABELS = 40;

/** The size Pele lays text out at when nothing is named: the SVG carries none. */
export const DIAGRAM_FONT_SIZE = 16;

/** A title is drawn bigger than a label by Pele's stylesheet; this is that step. */
export const DIAGRAM_TITLE_RATIO = 1.25;

/** The narrowest page a picture is ever given, in px — the floor for a frame with no window measured yet. */
export const DIAGRAM_BOX_WIDTH = 640;

/** How tall a picture may stand in the log before it is scaled down instead. */
export const DIAGRAM_BOX_HEIGHT = 420;

/** How far a picture smaller than its row may be blown up before the ink stops reading. */
export const DIAGRAM_UPSCALE = 1.5;
