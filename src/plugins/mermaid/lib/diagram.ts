/**
 * The diagram engine.
 *
 * Pele parses Mermaid source and lays it out as SVG with no browser and no
 * DOM — it measures text from its own metrics, which is why a diagram can be
 * drawn in the same process that answers a chat message. This file is the only
 * place the plugin names it: a caller asks for a picture and gets a
 * `MermaidPicture`, in one status vocabulary, never a parser's exception.
 *
 * What comes back is markup with its colours still written as `var(--pele-*)`.
 * `lib/palette.ts` turns those into the app's own colours at paint time, so a
 * diagram is wearing the theme the app is wearing rather than the one it
 * happened to be drawn under.
 */

import { detectType, render } from "pele";

import { DIAGRAM_FONT_SIZE, MAX_EDGES, MAX_LABELS } from "../constants";
import type { MermaidParseFailure, MermaidPicture } from "../types";

/** What the source is, in Pele's own name for it, or "" for a diagram it cannot see. */
function diagramKind(source: string): string {
  return detectType(source) ?? "";
}

const DIRECTION_TOKENS = ["TD", "TB", "BT", "LR", "RL"] as const;

/**
 * The direction a diagram asks to be drawn in.
 *
 * Only a line that *names* the diagram can state it — `flowchart LR`,
 * `direction TB`, `gitGraph TB:` — because a label is allowed to spell "LR".
 */
function diagramDirection(source: string): string {
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("%%")) continue;
    if (
      !/^(?:flowchart|graph|gitGraph|direction|stateDiagram|journey)\b/.test(
        trimmed,
      )
    ) {
      continue;
    }
    const found = DIRECTION_TOKENS.find((token) =>
      new RegExp(`(?:[\\s:]${token}(?=$|[\\s:;]))`).test(trimmed),
    );
    if (found !== undefined) return found;
  }
  return "";
}

/** A parser's exception, in the plugin's own words and fields. */
function failureOf(error: unknown): {
  error: string;
  failure: MermaidParseFailure;
} {
  const asRecord = (error ?? {}) as {
    message?: unknown;
    code?: unknown;
    line?: unknown;
    column?: unknown;
    snippet?: unknown;
  };
  const message =
    typeof asRecord.message === "string"
      ? asRecord.message.split("\n")[0]
      : String(error);
  const code =
    typeof asRecord.code === "string" && asRecord.code !== ""
      ? asRecord.code
      : "error";
  const line = typeof asRecord.line === "number" ? asRecord.line : 0;
  const column = typeof asRecord.column === "number" ? asRecord.column : 0;
  const snippet = typeof asRecord.snippet === "string" ? asRecord.snippet : "";
  return {
    error: message,
    failure: { code, line, column, snippet },
  };
}

const LABEL_TAG = /<(?:text|tspan)\b[^>]*>([\s\S]*?)<\/(?:text|tspan)>/g;

/**
 * What the diagram says.
 *
 * The labels Pele drew are the diagram's sentence, and the only reading of a
 * picture a model gets when it cannot see one. Nested markup inside a label is
 * dropped and the whitespace closed up, because a label is read as a phrase.
 */
function diagramLabels(svg: string): { labels: string[]; omitted: number } {
  const seen = new Set<string>();
  for (const match of svg.matchAll(LABEL_TAG)) {
    const text = match[1]
      .replace(/<[^>]*>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
    if (text !== "") seen.add(text);
  }
  const labels = [...seen];
  return {
    labels: labels.slice(0, MAX_LABELS),
    omitted: Math.max(0, labels.length - MAX_LABELS),
  };
}

const BLANK_PICTURE: Omit<MermaidPicture, "status" | "ms"> = {
  kind: "",
  direction: "",
  width: 0,
  height: 0,
  svg: "",
  svgBytes: 0,
  labels: [],
  labelsOmitted: 0,
  written: "",
  error: "",
  failure: null,
};

/**
 * Draw the source.
 *
 * The canvas is what Pele laid out, at its own size and font size: the log
 * scales the picture into its box, so a diagram that needs room is asked for
 * one rather than squeezed into one it was not planned for.
 */
export function renderDiagram(source: string): MermaidPicture {
  const start = performance.now();
  const trimmed = source.trim();
  if (trimmed === "") {
    return { ...BLANK_PICTURE, status: "empty", ms: 0 };
  }

  try {
    const result = render(trimmed, {
      responsive: false,
      fontSize: DIAGRAM_FONT_SIZE,
      maxEdges: MAX_EDGES,
    });
    const { labels, omitted } = diagramLabels(result.svg);
    return {
      status: "ok",
      kind: result.type,
      direction: diagramDirection(trimmed),
      width: result.width,
      height: result.height,
      ms: Math.round(performance.now() - start),
      svg: result.svg,
      svgBytes: result.svg.length,
      labels,
      labelsOmitted: omitted,
      written: "",
      error: "",
      failure: null,
    };
  } catch (error) {
    const failed = failureOf(error);
    return {
      ...BLANK_PICTURE,
      status: "failed",
      kind: diagramKind(trimmed),
      direction: diagramDirection(trimmed),
      ms: Math.round(performance.now() - start),
      error: failed.error,
      failure: failed.failure,
    };
  }
}
