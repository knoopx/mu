/**
 * The part of a diagram answer that is not the picture.
 *
 * A diagram call answers the model with a reading of the picture it drew: what
 * was drawn, how big it came out, and every label the diagram says — plus the
 * line a failed parse stopped on. Both halves live here so a story and the tool
 * cannot drift apart in their words.
 */

import { formatSize } from "@earendil-works/pi-coding-agent";

import {
  blocks,
  counted,
  moreLine,
  partsLine,
  statusTable,
} from "../../core/lib/agent/toolText";
import { diagramName } from "./toolView";
import type { MermaidParseFailure, MermaidPicture } from "../types";

/** Where the parser stopped, in the words a fix acts on. */
function failureAt(failure: MermaidParseFailure): string {
  if (failure.line <= 0) return "";
  return failure.column > 0
    ? `line ${String(failure.line)}, column ${String(failure.column)}`
    : `line ${String(failure.line)}`;
}

const LIMIT_HINT =
  "too many edges for one diagram — split it into two, each with its own header line";

/** A source the parser refused: what it called it, where, and the line it said it on. */
export function diagramFailureAnswer(picture: MermaidPicture): string {
  const failure = picture.failure;
  if (failure === null) return blocks(picture.error);
  return blocks(
    statusTable({
      diagram: diagramName(picture) === "" ? "(unnamed)" : diagramName(picture),
      error: failure.code,
      at: failureAt(failure),
    }),
    picture.error,
    failure.snippet,
    failure.code === "limit" ? LIMIT_HINT : "",
  );
}

/** A diagram that drew: its measurements, then what it says. */
export function diagramAnswerOf(
  picture: MermaidPicture,
  writeNote = "",
): string {
  const head = statusTable({
    diagram: diagramName(picture),
    canvas: `${String(picture.width)}x${String(picture.height)}`,
    svg: formatSize(picture.svgBytes),
    "drew in": `${String(picture.ms)} ms`,
    ...(picture.written === "" ? {} : { wrote: picture.written }),
  });

  const labels =
    picture.labels.length === 0
      ? picture.status === "ok"
        ? "the diagram draws no text at all — check the node labels"
        : ""
      : [
          `${counted(picture.labels.length, "label")} drawn: ${picture.labels.join(" · ")}`,
          moreLine(picture.labelsOmitted, "label"),
        ]
          .filter((line) => line !== "")
          .join("\n");

  return blocks(head, labels, writeNote);
}

/** A write the call asked for and did not get. */
export const writeFailureNote = (file: string, reason: string): string =>
  partsLine(`could not write ${file}`, reason);
