/**
 * The one structure contract: a tree of named things nested in groups.
 *
 * It is read once here and drawn from what was read, the way `lib/plot.ts` reads
 * a plot. A caller writes loosely and is met there rather than crashed — a
 * `children` slot holding one value instead of a list is one child, exactly as a
 * program's `Tree` reads one — because a model that meant one child should get
 * one child, not an empty screen.
 *
 * What a shape *cannot* mean is answered and refused, the way a plot refuses a
 * cell that is not a number: a node with no name to draw. A silently-dropped
 * branch is a tree that lies, so the answer names the node, quotes what stood
 * where its name belonged, and the next call is right.
 *
 * Nothing here resolves a colour or builds a widget: a structure travels as data
 * and is painted in the theme the window is wearing at the moment it is drawn.
 */

import type { FileTreeNode } from "adwaita-gpuix/ai";

import { truncateToWidth } from "../../../utils/truncate";
import { MAX_DEPTH, MAX_NAME_CHARS, MAX_NODES } from "../constants";
import type {
  StructureNode,
  TreeFigure,
  TreeRenderParams,
} from "../types";
import { cellText, numberOf } from "./plot";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * A name clipped to a name's measure: a tree's rows are narrow by design.
 *
 * It is also the measure of what a refusal quotes back — the text that sat where
 * a name belonged is quoted so it can be recognised, not read.
 */
const nameText = (value: unknown): string =>
  truncateToWidth(cellText(value).trim(), MAX_NAME_CHARS);

/** A figure a node trails, never negative: `−3 lines` is not a thing a node did. */
const countOf = (value: unknown): number => {
  const number = numberOf(value);
  return number === null || number < 0 ? 0 : number;
};

/**
 * A slot that should hold a list, read the way a program's rows are read: one
 * value named where a list was expected is a list of one. The schema will not
 * say so, and a reader that reached for `.map` on it would lose the child.
 */
function listOf(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

/* ------------------------------------------------------------------- tree */

const NAME_KEYS = ["name", "path", "label", "title"] as const;
const CHILD_KEYS = ["children", "items", "nodes", "files"] as const;
const FOLDER_KINDS: readonly string[] = ["folder", "directory", "dir"];

/** The order a loose array-node puts its parts in — the one a program's `Tree` reads them in. */
const AT_NAME = 0;
const AT_KIND = 1;
const AT_CHILDREN = 2;
const AT_ADDED = 3;
const AT_REMOVED = 4;

/** What one node of the call holds, whatever shape it was written in. */
interface NodeShape {
  name: string;
  folder: boolean;
  children: unknown;
  added: number;
  removed: number;

  /** What was written where a name belonged, so a refusal can quote it. */
  written: string;
}

const kindText = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const keyOf = (
  row: Record<string, unknown>,
  keys: readonly string[],
): unknown =>
  keys.reduce<unknown>((found, key) => found ?? row[key], undefined);

/** The shape one node was written in, whatever it was written in. */
function nodeShapeOf(value: unknown): NodeShape | null {
  if (typeof value === "string" || typeof value === "number") {
    return {
      name: nameText(value),
      folder: false,
      children: undefined,
      added: 0,
      removed: 0,
      written: "",
    };
  }

  if (Array.isArray(value)) {
    return {
      name: nameText(value[AT_NAME]),
      folder: FOLDER_KINDS.includes(kindText(value[AT_KIND])),
      children: value[AT_CHILDREN],
      added: countOf(value[AT_ADDED]),
      removed: countOf(value[AT_REMOVED]),
      written: nameText(value[AT_NAME]),
    };
  }

  if (!isRecord(value)) return null;

  const named = keyOf(value, NAME_KEYS);
  return {
    name: nameText(named),
    folder: FOLDER_KINDS.includes(kindText(keyOf(value, ["kind", "type"]))),
    children: keyOf(value, CHILD_KEYS),
    added: countOf(value["added"]),
    removed: countOf(value["removed"]),
    written: nameText(named),
  };
}

interface TreeRead {
  /** Nodes drawn, and branches the caps cut — the difference is what a caller has to narrow. */
  drawn: number;
  cut: number;

  bad: { under: string; value: string }[];
}

/**
 * One node, and everything under it.
 *
 * `under` is the path the node hangs from, which is what a refusal quotes: "the
 * node under `src/plugins` has no name" says where to look without asking the
 * caller to count its siblings.
 */
function readNode(
  value: unknown,
  under: string,
  depth: number,
  read: TreeRead,
): StructureNode | null {
  const shape = nodeShapeOf(value);
  if (shape === null || shape.name === "") {
    read.bad.push({
      under: under === "" ? "(the root)" : under,
      value: shape === null ? nameText(value) : shape.written,
    });
    return null;
  }

  if (depth > MAX_DEPTH || read.drawn >= MAX_NODES) {
    read.cut += 1;
    return null;
  }
  read.drawn += 1;

  const path = under === "" ? shape.name : `${under}/${shape.name}`;
  const children = listOf(shape.children)
    .map((child) => readNode(child, path, depth + 1, read))
    .filter((child): child is StructureNode => child !== null);

  return {
    name: shape.name,
    folder: children.length > 0 || shape.folder,
    children,
    added: shape.added,
    removed: shape.removed,
  };
}

interface TreeCount {
  folders: number;
  leaves: number;
  depth: number;
  added: number;
  removed: number;
}

function countTree(
  nodes: readonly StructureNode[],
  depth: number,
  count: TreeCount,
): void {
  for (const node of nodes) {
    count.depth = Math.max(count.depth, depth);
    count.added += node.added;
    count.removed += node.removed;
    if (node.children.length === 0) count.leaves += 1;
    else {
      count.folders += 1;
      countTree(node.children, depth + 1, count);
    }
  }
}

/** Every node, deepest last, with the path the widget keys it by. */
function walk(
  nodes: readonly StructureNode[],
  visit: (node: StructureNode, depth: number, path: string) => void,
  depth = 1,
  parent = "",
): void {
  for (const node of nodes) {
    const path = parent === "" ? node.name : `${parent}/${node.name}`;
    visit(node, depth, path);
    walk(node.children, visit, depth + 1, path);
  }
}

/** A tree, in one status vocabulary. */
export function treeShapeOf(params: TreeRenderParams): TreeFigure {
  const read: TreeRead = { drawn: 0, cut: 0, bad: [] };
  const roots = listOf(params.items)
    .map((item) => readNode(item, "", 1, read))
    .filter((node): node is StructureNode => node !== null);

  const count: TreeCount = {
    folders: 0,
    leaves: 0,
    depth: 0,
    added: 0,
    removed: 0,
  };
  countTree(roots, 1, count);

  const asked = listOf(params.expanded)
    .map((path) => String(path).trim())
    .filter((path) => path !== "");

  const figure: TreeFigure = {
    status: "ok",
    nodes: roots,
    // A tree nobody said anything about opens its first level, so the leaves are
    // what the log shows rather than a row of closed folders.
    expanded:
      asked.length > 0
        ? asked
        : roots.filter((node) => node.folder).map((node) => node.name),
    caption: (params.caption ?? "").trim(),
    counted: read.drawn + read.cut,
    drawn: read.drawn,
    omitted: read.cut,
    folders: count.folders,
    leaves: count.leaves,
    depth: count.depth,
    added: count.added,
    removed: count.removed,
    bad: read.bad,
    error: "",
  };

  if (read.bad.length > 0) {
    figure.status = "invalid";
    figure.nodes = [];
    figure.drawn = 0;
    figure.error = "a node has no name to draw";
    return figure;
  }
  if (read.drawn === 0) {
    figure.status = "empty";
    figure.error = "the tree has no named nodes";
  }
  return figure;
}

/** The tree the widget draws: adwaita's own rows, chevrons and all. */
export function fileTreeOf(nodes: readonly StructureNode[]): FileTreeNode[] {
  return nodes.map((node) => ({
    name: node.name,
    type: node.folder ? "folder" : "file",
    ...(node.children.length === 0
      ? {}
      : { children: fileTreeOf(node.children) }),
    ...(node.added === 0 ? {} : { added: node.added }),
    ...(node.removed === 0 ? {} : { removed: node.removed }),
  }));
}

/** The tree read back as indented text — the form a caller can check it against. */
export function treeLinesOf(
  figure: TreeFigure,
  max: number,
): { lines: string[]; notRead: number } {
  const lines: string[] = [];
  let notRead = 0;
  walk(figure.nodes, (node, depth) => {
    if (lines.length >= max) {
      notRead += 1;
      return;
    }
    lines.push(
      `${"  ".repeat(Math.max(0, depth - 1))}${node.name}${node.folder ? "/" : ""}`,
    );
  });
  return { lines, notRead };
}
