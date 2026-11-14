/**
 * Turns a diagram answer into what the transcript draws.
 *
 * A diagram call answers two audiences: `content` text for the model, and the
 * picture plus its measurements in `details` for the log. This file folds the
 * details into one view — the chips of what was drawn, the one line that says
 * what went wrong, and the markup to paint — so the component never parses an
 * answer and never learns the engine's name.
 */

import { formatSize } from "@earendil-works/pi-coding-agent";

import { counted, partsLine } from "../../core/lib/agent/toolText";
import type { ToolRowCell } from "../../core/lib/ui/toolRowPaint";
import { MERMAID_RENDER_TOOL } from "../constants";
import type { MermaidPicture, MermaidStatus } from "../types";

export interface MermaidToolView {
  status: MermaidStatus;

  /** The picture, or the shape of the failure. Never absent: the header reads it too. */
  picture: MermaidPicture;

  cells: ToolRowCell[];

  /** Where the markup was written, when the call asked for a file. */
  written: string;
}

const EMPTY: MermaidPicture = {
  status: "empty",
  kind: "",
  direction: "",
  width: 0,
  height: 0,
  ms: 0,
  svg: "",
  svgBytes: 0,
  labels: [],
  labelsOmitted: 0,
  written: "",
  error: "",
  failure: null,
};

function stringOf(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberOf(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function failureOf(value: unknown) {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  return {
    code: stringOf(record["code"]),
    line: numberOf(record["line"]),
    column: numberOf(record["column"]),
    snippet: stringOf(record["snippet"]),
  };
}

/** The details of a diagram answer, or null when the answer is not one. */
function pictureOf(details: unknown): MermaidPicture | null {
  if (typeof details !== "object" || details === null) return null;
  const record = details as Record<string, unknown>;
  const status = stringOf(record["status"]);
  if (status !== "ok" && status !== "failed" && status !== "empty") return null;

  return {
    status: status as MermaidStatus,
    kind: stringOf(record["kind"]),
    direction: stringOf(record["direction"]),
    width: numberOf(record["width"]),
    height: numberOf(record["height"]),
    ms: numberOf(record["ms"]),
    svg: stringOf(record["svg"]),
    svgBytes: numberOf(record["svgBytes"]),
    labels: Array.isArray(record["labels"])
      ? record["labels"].filter(
          (label): label is string => typeof label === "string",
        )
      : [],
    labelsOmitted: numberOf(record["labelsOmitted"]),
    written: stringOf(record["written"]),
    error: stringOf(record["error"]),
    failure: failureOf(record["failure"]),
  };
}

/** `flowchart LR`, or what little of it is known. */
export const diagramName = (picture: MermaidPicture): string =>
  picture.direction === ""
    ? picture.kind
    : `${picture.kind} ${picture.direction}`;

/** The line a failed parse leaves behind: what the parser called it, and where. */
export function diagramFailureLine(picture: MermaidPicture): string {
  const failure = picture.failure;
  if (failure === null) return picture.error;
  const at =
    failure.line <= 0
      ? ""
      : `line ${String(failure.line)}${failure.column > 0 ? `, column ${String(failure.column)}` : ""}`;
  return partsLine(failure.code === "" ? "" : failure.code, picture.error, at);
}

export function mermaidToolViewOf(
  name: string,
  _args: Record<string, unknown> | undefined,
  details: unknown,
  itemStatus: string,
): MermaidToolView | null {
  if (name.toLowerCase() !== MERMAID_RENDER_TOOL) return null;

  const picture = pictureOf(details);
  if (picture === null) return null;

  const cells: ToolRowCell[] = [
    { label: "diagram", value: diagramName(picture) },
    {
      label: "canvas",
      value:
        picture.width === 0
          ? ""
          : `${String(picture.width)}×${String(picture.height)}`,
    },
    {
      label: "labels",
      value:
        picture.status === "ok" ? counted(picture.labels.length, "label") : "",
    },
    {
      label: "svg",
      value: picture.svgBytes === 0 ? "" : formatSize(picture.svgBytes),
    },
    {
      label: "drew in",
      value: picture.ms === 0 ? "" : `${String(picture.ms)} ms`,
    },
    { label: "wrote", value: picture.written },
  ];

  return {
    status:
      itemStatus === "error" && picture.status === "ok"
        ? "failed"
        : picture.status,
    picture,
    cells,
    written: picture.written,
  };
}
