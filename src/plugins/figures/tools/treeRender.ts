/**
 * `tree-render` — named things nested in groups in, a tree out.
 *
 * The tree is painted in the transcript for the human, in adwaita's own rows, and
 * its folders open and close under the cursor. What the model gets is a reading
 * of it: how many nodes, how many folders, how deep, what moved, and the shape
 * itself as indented text — which is how a tree that came out wrong is caught by
 * something that cannot see it. A node with no name refuses the call and says
 * where it hangs.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type { PluginTool } from "../../core/lib/plugin/manifest";
import { toolResult } from "../../core/lib/agent/toolText";
import {
  MAX_NAME_CHARS,
  MAX_NODES,
  TREE_RENDER_TOOL,
  TREE_TOOL_LABEL,
} from "../constants";
import {
  treeAnswerOf,
  treeEmptyAnswer,
  treeInvalidAnswer,
} from "../lib/answer";
import { treeShapeOf } from "../lib/structure";
import type { TreeFigure, TreeRenderParams } from "../types";

/** A leaf, named by itself. */
const LeafSchema = Type.String({
  maxLength: MAX_NAME_CHARS,
  description: "a leaf that names itself: `plot.ts`",
});

/**
 * The children slot takes anything, because it takes the same shape again and a
 * schema that says so would have to be infinite. The reader does not care: a bare
 * value in a children slot is one child, and that is the whole tolerance.
 */
const NodeSchema = Type.Object({
  name: Type.String({
    maxLength: MAX_NAME_CHARS,
    description:
      "the node's own name — one segment (`plugins`), not a path (`src/plugins`)",
  }),
  kind: Type.Optional(
    Type.Union([Type.Literal("file"), Type.Literal("folder")], {
      description:
        "`folder` stands open even when it names no children; a node with children is a folder whatever it is called.",
    }),
  ),
  children: Type.Optional(
    Type.Array(Type.Any(), {
      maxItems: MAX_NODES,
      description:
        'what hangs under this node — the same shape again, or a bare name for a leaf: `children: ["lib", "hooks", "tools"]`',
    }),
  ),
  added: Type.Optional(
    Type.Number({
      minimum: 0,
      description:
        "lines added, when the tree is a changeset: the log draws a `+N` column measured across the whole tree.",
    }),
  ),
  removed: Type.Optional(
    Type.Number({
      minimum: 0,
      description: "lines deleted, same column, the `−M` beside it.",
    }),
  ),
});

const ItemSchema = Type.Union([LeafSchema, NodeSchema], {
  description: "a node with its children, or a bare name for a leaf",
});

const RenderParametersSchema = Type.Object({
  items: Type.Array(ItemSchema, {
    minItems: 0,
    maxItems: MAX_NODES,
    description:
      'The roots, in the order they stand: `[{name: "src", children: ["main.tsx", {name: "plugins", children: ["vcs", "figures"]}]}]`.',
  }),
  expanded: Type.Optional(
    Type.Array(Type.String(), {
      maxItems: MAX_NODES,
      description:
        "Which folders stand open, by path (`src`, `src/plugins`). Leave it out and the top level stands open, so the leaves are what the log shows.",
    }),
  ),
  caption: Type.Optional(
    Type.String({
      maxLength: 120,
      description: "One line under the tree, for the reader of the log.",
    }),
  ),
});

export function executeTreeRender(
  params: TreeRenderParams,
): AgentToolResult<TreeFigure> {
  const figure = treeShapeOf(params);

  if (figure.status === "invalid") {
    return toolResult(treeInvalidAnswer(figure), figure);
  }
  if (figure.status === "empty") {
    return toolResult(treeEmptyAnswer(figure), figure);
  }
  return toolResult(treeAnswerOf(figure), figure);
}

export const treeRenderTool: PluginTool<
  typeof RenderParametersSchema,
  TreeFigure
> = {
  name: TREE_RENDER_TOOL,
  icon: "accountTree",
  label: TREE_TOOL_LABEL,
  description:
    "Draw a tree of named things nested in groups: a package's folders, a module graph, a call chain, an " +
    "ownership tree, a changeset. The tree is painted in the transcript for the human and its folders open and " +
    "close under the cursor. The answer states how many nodes, folders and leaves there are, how deep it goes, " +
    "what moved when the nodes carry added/removed, and the tree itself as indented text — so a tree that came " +
    "out wrong is visible without seeing it. A node with no name refuses the call and names the path it hangs under.",
  promptSnippet:
    "Draw a tree of nested nodes in the transcript; the answer walks the tree back as indented text",
  promptGuidelines: [
    "Use tree-render when the answer is containment: which files sit in which folder, what a module pulls in, who calls whom, what a package holds.",
    "A node names itself with `name` — one path segment, not a path — and `children` holds what hangs under it; a bare string in a children slot is a leaf.",
    "`added` and `removed` on the nodes turn the tree into a changeset and the log draws the `+N −M` columns measured across the whole tree.",
    "You cannot see the tree — read the indented text the answer walks back. A leaf that ended up one level too deep is a nesting mistake in what you sent.",
    "A node with no name refuses the whole call and names the path it hangs under: fix that node and re-send.",
    "Past 80 nodes, or 10 levels deep, branches are cut and the answer says how many: draw the part of the tree that carries the point.",
    "Use chart-render for numbers across an axis, and openui-render — whose `Table` draws named columns — when the thing to show is one part of a screen the human operates.",
  ],

  executionMode: "sequential",
  parameters: RenderParametersSchema,

  async execute(_toolCallId, params) {
    return executeTreeRender({
      items: params.items,
      expanded: params.expanded ?? [],
      caption: params.caption,
    });
  },
};
