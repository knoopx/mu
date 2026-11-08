/**
 * `table-render` — a header and its rows in, a table out.
 *
 * The table is painted in the transcript for the human, in adwaita's own rows,
 * with a column of figures set in mono and standing on the right of its column.
 * What the model gets is a reading of it: the header, the rows as an aligned
 * table, and what each column of figures sums to and ranges between — which is
 * how a table whose cells went into the wrong columns is caught by something that
 * cannot see it. A row that does not fit the header refuses the call and names the
 * cell that had nowhere to stand.
 */

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { toolResult } from "../../core/lib/agent/toolText";
import {
  MAX_CELL_CHARS,
  MAX_COLUMNS,
  MAX_ROWS,
  TABLE_RENDER_TOOL,
  TABLE_TOOL_LABEL,
} from "../constants";
import {
  tableAnswerOf,
  tableEmptyAnswer,
  tableInvalidAnswer,
} from "../lib/answer";
import { tableShapeOf } from "../lib/structure";
import type { TableFigure, TableRenderParams } from "../types";

/** One cell: text, or a figure the log can line up and add. */
const CellSchema = Type.Union([
  Type.String({ maxLength: MAX_CELL_CHARS, description: "a word" }),
  Type.Number({ description: "a figure — a bare number, never `\"1,234\"`" }),
  Type.Boolean({ description: "drawn as `yes` or `no`" }),
]);

const RowSchema = Type.Union(
  [
    Type.Array(CellSchema, {
      maxItems: MAX_COLUMNS,
      description: "one cell per column, in the header's order",
    }),
    Type.Record(Type.String(), CellSchema, {
      description: "one entry per column, keyed by the header's name",
    }),
    CellSchema,
  ],
  {
    description:
      "a row: `[\"vcs\", 12, \"ok\"]`, or `{tool: \"vcs\", calls: 12, state: \"ok\"}` keyed by the column names",
  },
);

const RenderParametersSchema = Type.Object({
  rows: Type.Array(RowSchema, {
    minItems: 0,
    maxItems: 400,
    description:
      "The rows, in the order they stand: `[[\"core\", 41, \"settled\"], [\"vcs\", 12, \"moving\"]]`.",
  }),
  columns: Type.Optional(
    Type.Array(Type.String({ maxLength: MAX_CELL_CHARS }), {
      maxItems: MAX_COLUMNS,
      description:
        "The header: one name per column, in the order a row's cells stand in them. Leave it out and the header is the keys of your first object row — or the count of the column, when the rows are lists.",
    }),
  ),
  caption: Type.Optional(
    Type.String({
      maxLength: 120,
      description: "One line under the table, for the reader of the log.",
    }),
  ),
});

export function executeTableRender(
  params: TableRenderParams,
): AgentToolResult<TableFigure> {
  const figure = tableShapeOf(params);

  if (figure.status === "invalid") {
    return toolResult(tableInvalidAnswer(figure), figure);
  }
  if (figure.status === "empty") {
    return toolResult(tableEmptyAnswer(figure), figure);
  }
  return toolResult(tableAnswerOf(figure), figure);
}

export const tableRenderTool: ToolDefinition<
  typeof RenderParametersSchema,
  TableFigure
> = {
  name: TABLE_RENDER_TOOL,
  label: TABLE_TOOL_LABEL,
  description:
    "Draw a table: a header row, then one row per thing, each row a list of cells or an object keyed by the " +
    "column names. The table is painted in the transcript for the human, and a column whose cells are all numbers " +
    "is set in mono and right-aligned. The answer states the header, the rows as an aligned table, and what each " +
    "column of figures sums to and ranges between — so a table that came out wrong is visible without seeing it. A " +
    "row wider than the header refuses the call and names the cell that had no column to stand in.",
  promptSnippet: "Draw a table in the transcript; the answer reads the rows and the column figures back",
  promptGuidelines: [
    "Use table-render when the answer is several things measured the same way: a survey, a comparison, a per-file count, a status board.",
    "`columns` names the header, one name per column; a row is a list of cells in that order, or an object keyed by those names.",
    "A cell that is a number is a figure: the column is drawn in mono on the right and the answer reads back its Σ, min and max — so a figure you meant as text still has to go in as a number.",
    "You cannot see the table — read the aligned rows and the column figures the answer gives you. A total that is not the one you meant means cells went into the wrong columns.",
    "A row wider than the header, or an object with a key no column names, refuses the whole call and names the cell: fix the header or the row and re-send.",
    "Past 60 rows the rest are not drawn and the answer says how many: group the rows or send the ones that carry the point.",
    "Use chart-render for values across an axis, tree-render for containment, and openui-render when the rows have to be filtered or picked at.",
  ],

  executionMode: "sequential",
  parameters: RenderParametersSchema,

  async execute(_toolCallId, params) {
    return executeTableRender({
      rows: params.rows,
      columns: params.columns ?? [],
      caption: params.caption,
    });
  },
};
