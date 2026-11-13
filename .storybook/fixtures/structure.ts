import {
  TABLE_RENDER_TOOL,
  TREE_RENDER_TOOL,
} from "../../src/plugins/figures/constants";
import {
  tableAnswerOf,
  tableInvalidAnswer,
  treeAnswerOf,
} from "../../src/plugins/figures/lib/answer";
import {
  tableShapeOf,
  treeShapeOf,
} from "../../src/plugins/figures/lib/structure";
import { toolCallFixture, type ToolFixture } from "./tool";

/** What the agent worked out about the plugin that grew two tools. */
export const TREE_ITEMS = [
  {
    name: "figures",
    children: [
      "constants.ts",
      "types.ts",
      {
        name: "lib",
        children: ["plot.ts", "structure.ts", "answer.ts", "toolView.ts"],
      },
      {
        name: "components",
        children: [
          "ChartToolRows.tsx",
          "TreeToolRows.tsx",
          "TableToolRows.tsx",
        ],
      },
      {
        name: "tools",
        children: ["chartRender.ts", "treeRender.ts", "tableRender.ts"],
        added: 331,
        removed: 4,
      },
    ],
  },
];

const treeParams = {
  items: TREE_ITEMS,
  caption:
    "one plugin, three figures: the new contract sits beside the plot's, and each tool is one file",
};

const tree = treeShapeOf(treeParams);

/** A tree that drew, and the reading its answer gave the model. */
export const TREE_ITEM: ToolFixture = toolCallFixture(
  "call-tree",
  TREE_RENDER_TOOL,
  treeParams,
  "ok",
  treeAnswerOf(tree),
  { details: tree },
);

/** What the agent measured per tool — the same call a header mis-counted first. */
export const TABLE_COLUMNS = ["tool", "calls", "tokens", "state"];

export const TABLE_ROWS = [
  ["chart-render", 41, 12_310, "settled"],
  ["tree-render", 6, 1_940, "new"],
  ["table-render", 5, 1_112, "new"],
  { tool: "mermaid-render", calls: 12, tokens: 3_860, state: "settled" },
  { tool: "openui-render", calls: 28, tokens: 9_404, state: "moving" },
];

const tableParams = {
  columns: TABLE_COLUMNS,
  rows: TABLE_ROWS,
  caption: "the cost of drawing, per tool, this session",
};

const table = tableShapeOf(tableParams);

/** A table that drew: its figure columns in mono, and its Σ read back. */
export const TABLE_ITEM: ToolFixture = toolCallFixture(
  "call-table",
  TABLE_RENDER_TOOL,
  tableParams,
  "ok",
  tableAnswerOf(table),
  { details: table },
);

/** The same call with a cell that had no column to stand in. */
const BROKEN_PARAMS = {
  columns: TABLE_COLUMNS,
  rows: [["tree-render", 6, 1_940, "new", "two tools now"]],
};

const broken = tableShapeOf(BROKEN_PARAMS);

export const TABLE_BAD_ITEM: ToolFixture = toolCallFixture(
  "call-table-broken",
  TABLE_RENDER_TOOL,
  BROKEN_PARAMS,
  "ok",
  tableInvalidAnswer(broken),
  { details: broken },
);

export const STRUCTURE_ANSWER =
  "The plugin kept its shape: `lib/structure.ts` is the second contract beside `lib/plot.ts`, and each figure is " +
  "still one file in `tools/`. The drawing cost is not what grew — `chart-render` is still the most expensive call " +
  "in the session, and the two new tools together cost less than one mermaid diagram";
