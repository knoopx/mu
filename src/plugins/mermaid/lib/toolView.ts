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

import {
  detailsAs,
  detailNumber,
  detailStrings,
  detailText,
  detailWord,
} from "../../core/lib/agent/toolDetails";
import { partsLine } from "../../core/lib/agent/toolText";
import type { ToolRowCell } from "../../core/lib/ui/toolRowPaint";
import { MERMAID_RENDER_TOOL } from "../constants";
import type {
  MermaidParseFailure,
  MermaidPicture,
  MermaidStatus,
} from "../types";

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

/** The statuses a diagram answer can carry; anything else is not a diagram. */
const STATUSES = [
  "ok",
  "failed",
  "empty",
] as const satisfies readonly MermaidStatus[];

/** Why the parser stopped, read from the JSON a resumed session keeps. */
function failureOf(value: unknown): MermaidParseFailure | null {
  const failure = detailsAs<MermaidParseFailure>(value);
  if (failure === null) return null;
  return {
    code: detailText(failure.code),
    line: detailNumber(failure.line),
    column: detailNumber(failure.column),
    snippet: detailText(failure.snippet),
  };
}

/**
 * The details of a diagram answer, or null when the answer is not one.
 *
 * The answer is read through `MermaidPicture` — the interface the tool wrote —
 * so every field this reader names has to be one that interface has, while each
 * value is still coerced, because the details of a session resumed this week are
 * JSON rather than the object the call returned.
 */
function pictureOf(details: unknown): MermaidPicture | null {
  const answer = detailsAs<MermaidPicture>(details);
  if (answer === null) return null;
  const status = detailWord(answer.status, STATUSES);
  if (status === null) return null;

  return {
    status,
    kind: detailText(answer.kind),
    direction: detailText(answer.direction),
    width: detailNumber(answer.width),
    height: detailNumber(answer.height),
    ms: detailNumber(answer.ms),
    svg: detailText(answer.svg),
    svgBytes: detailNumber(answer.svgBytes),
    labels: detailStrings(answer.labels),
    labelsOmitted: detailNumber(answer.labelsOmitted),
    written: detailText(answer.written),
    error: detailText(answer.error),
    failure: failureOf(answer.failure),
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

  // The header line owns the kind and the file the SVG was written to, so
  // neither is a chip; and `labels 12 labels` says its own unit twice.
  const cells: ToolRowCell[] = [
    {
      label: "canvas",
      value:
        picture.width === 0
          ? ""
          : `${String(picture.width)}×${String(picture.height)}`,
    },
    {
      label: "labels",
      value: picture.status === "ok" ? String(picture.labels.length) : "",
    },
    {
      label: "svg",
      value: picture.svgBytes === 0 ? "" : formatSize(picture.svgBytes),
    },
    {
      label: "drew in",
      value: picture.ms === 0 ? "" : `${String(picture.ms)} ms`,
    },
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
