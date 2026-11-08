/**
 * `mermaid-render` — Mermaid source in, a diagram out.
 *
 * The picture is painted in the transcript for the human. What the model gets
 * is the reading of it: the kind that was drawn, the canvas it was laid out on,
 * and the labels the diagram says — which is how a diagram that came out wrong
 * is caught by something that cannot see it. A parse failure comes back with
 * the line, the column and the snippet the parser stopped on.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { toolResult } from "../../core/lib/agent/toolText";
import { MERMAID_RENDER_TOOL, MERMAID_TOOL_LABEL, MAX_SOURCE_CHARS } from "../constants";
import {
  diagramAnswerOf,
  diagramFailureAnswer,
  writeFailureNote,
} from "../lib/answer";
import { renderDiagram } from "../lib/diagram";
import type { MermaidPicture, MermaidRenderParams } from "../types";

const RenderParametersSchema = Type.Object({
  source: Type.String({
    minLength: 1,
    maxLength: MAX_SOURCE_CHARS,
    description:
      "Complete Mermaid source, header line included: `flowchart TD`, `sequenceDiagram`, `classDiagram`, `gitGraph`, `pie title …`",
  }),
  path: Type.Optional(
    Type.String({
      minLength: 1,
      description:
        "Also write the SVG markup to this file (e.g. `docs/architecture.svg`) so the diagram can be committed or opened; a relative path resolves from the project",
    }),
  ),
});

export async function executeMermaidRender(
  params: MermaidRenderParams,
): Promise<AgentToolResult<MermaidPicture>> {
  const picture = renderDiagram(params.source);
  if (picture.status !== "ok") {
    return toolResult(diagramFailureAnswer(picture), picture);
  }

  const target = (params.path ?? "").trim();
  let writeNote = "";
  if (target !== "") {
    const file = isAbsolute(target) ? target : resolve(target);
    try {
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, picture.svg, "utf8");
      picture.written = file;
    } catch (error) {
      writeNote = writeFailureNote(
        file,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return toolResult(diagramAnswerOf(picture, writeNote), picture);
}

export const mermaidRenderTool: ToolDefinition<
  typeof RenderParametersSchema,
  MermaidPicture
> = {
  name: MERMAID_RENDER_TOOL,
  label: MERMAID_TOOL_LABEL,
  description:
    "Draw Mermaid source as a diagram: flowcharts, sequence, state and class diagrams, ER, gantt, pie, git graphs, " +
    "mindmaps, C4, timelines, kanban, quadrants, sankeys and more. The picture is painted in the transcript for the " +
    "human. The answer states the kind that was drawn, the canvas it was laid out on, and every label the diagram " +
    "says, so a diagram that came out empty or wrong is visible without seeing it. A parse failure returns its code, " +
    "line, column and the source line it stopped on.",
  promptSnippet: "Render Mermaid source as a diagram; the picture is painted in the transcript",
  promptGuidelines: [
    "Use mermaid-render when a diagram explains a thing better than prose: an architecture, a sequence, a state machine, a timeline, a decision.",
    "The source is complete Mermaid, header line included (`flowchart TD`, `sequenceDiagram`, `gitGraph`, `pie title …`); comments may start with `%%`.",
    "You cannot see the picture — read the labels the answer lists. A label that is missing or wrong means the source is wrong, not the renderer.",
    "A parse failure answers with the code, line, column and snippet: fix that line and render again rather than rewriting the whole diagram.",
    "`path` writes the SVG (e.g. docs/architecture.svg) so a diagram can be committed or opened; the transcript scales the picture to fit, the file does not.",
    "One diagram, one idea. A canvas wider than ~1600px, or a `limit` error, is the sign to split it into two calls.",
  ],

  executionMode: "sequential",
  parameters: RenderParametersSchema,

  async execute(_toolCallId, params) {
    return executeMermaidRender(params);
  },
};
