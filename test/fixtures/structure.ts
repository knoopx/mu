import { TREE_RENDER_TOOL } from "../../src/plugins/figures/constants";
import {
  treeAnswerOf,
  treeInvalidAnswer,
} from "../../src/plugins/figures/lib/answer";
import { treeShapeOf } from "../../src/plugins/figures/lib/structure";
import { toolCallFixture, type ToolFixture } from "./tool";

/** What the agent read back of the plugin that lost one of its three figures. */
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
        children: ["ChartToolRows.tsx", "TreeToolRows.tsx"],
        added: 1,
        removed: 221,
      },
      {
        name: "tools",
        children: ["chartRender.ts", "treeRender.ts"],
        added: 2,
        removed: 132,
      },
    ],
  },
];

const treeParams = {
  items: TREE_ITEMS,
  caption:
    "figures after the table came out: one contract beside the plot's, and one file per tool that is left",
};

const tree = treeShapeOf(treeParams);

/** A tree that drew, its changeset columns, and the reading its answer gave the model. */
export const TREE_ITEM: ToolFixture = toolCallFixture(
  "call-tree",
  TREE_RENDER_TOOL,
  treeParams,
  "ok",
  treeAnswerOf(tree),
  { details: tree },
);

/** The same folder written by someone who named the folders' contents and not the folders. */
const UNTITLED_PARAMS = {
  items: [
    {
      name: "figures",
      children: [
        { kind: "folder", children: ["plot.ts", "structure.ts"] },
        { kind: "folder", children: ["ChartToolRows.tsx", "TreeToolRows.tsx"] },
      ],
    },
  ],
  caption: "the same folder, one contract shorter",
};

const untitled = treeShapeOf(UNTITLED_PARAMS);

/** A node with no name to draw: the whole call refused, and the refusal says where it hangs. */
export const TREE_BAD_ITEM: ToolFixture = toolCallFixture(
  "call-tree-untitled",
  TREE_RENDER_TOOL,
  UNTITLED_PARAMS,
  "ok",
  treeInvalidAnswer(untitled),
  { details: untitled },
);

export const STRUCTURE_ANSWER =
  "The plugin is one contract shorter, not one file longer: `lib/structure.ts` still reads the tree loosely and " +
  "refuses what it cannot mean, and the folder above is that shape walked back as text — 14 nodes, 4 folders, " +
  "10 leaves, 3 deep, `+3 −353` measured across the whole tree, which is the deletion and nothing else. The " +
  "second call is the one worth reading: it drew nothing, because a folder with no name is a branch the log " +
  "cannot label, and the refusal names the parent it hangs under instead of printing a tree with holes in it.";
