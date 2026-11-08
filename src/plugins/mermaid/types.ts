/** What a diagram call answers with, for the model and for the log. */

/**
 * `ok` drew a picture; `failed` is the parser refusing the source;
 * `empty` is a call with nothing to draw.
 */
export type MermaidStatus = "ok" | "failed" | "empty";

/** Why the parser stopped, in the words it stopped with. */
export interface MermaidParseFailure {
  /** `syntax` | `semantic` | `limit` | `unsupported-diagram` | `error` */
  code: string;

  line: number;
  column: number;

  /** The source line the parser stopped on, with its caret. */
  snippet: string;
}

/**
 * A rendered diagram.
 *
 * The SVG markup travels in the details, with Pele's `var(--pele-*)` colours
 * still unwritten: the log paints the picture in the colours the app is wearing
 * right now, so the same call still reads correctly after a theme change.
 */
export interface MermaidPicture {
  status: MermaidStatus;

  /** What Pele drew, as it names it: `flowchart`, `sequence`, `gitGraph`, … */
  kind: string;

  /** The direction the header line asked for, when it asked for one. */
  direction: string;

  /** The canvas Pele laid the diagram out on, in px. */
  width: number;
  height: number;

  ms: number;

  svg: string;
  svgBytes: number;

  /** What the diagram says: the labels it draws, in the order it draws them. */
  labels: string[];
  labelsOmitted: number;

  /** The file the markup was written to, when the call asked for one. */
  written: string;

  error: string;
  failure: MermaidParseFailure | null;
}

export interface MermaidRenderParams {
  source: string;
  path?: string;
}

export type { MermaidPicture as MermaidRenderDetails };
