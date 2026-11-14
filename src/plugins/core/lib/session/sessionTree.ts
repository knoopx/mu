import {
  generateGraphData,
  graphLaneCount,
  type GraphNode,
  type IconName,
} from "adwaita-gpuix";
import type {
  SessionEntry,
  SessionTreeNode,
} from "@earendil-works/pi-coding-agent";
import { contentToText } from "../agent/content";
import { fitOneLine } from "../../../../utils/truncate";
import { isSnapcompactDetails } from "../../../snapcompact/lib/archive";
import { detailsNote } from "../../../snapcompact/lib/note";
import { relativeAge } from "../utils/time";
import { toolIconFor } from "../plugin/surfaces";
import { HOST } from "../../../registry";

export type TreeFilter =
  "no-tools" | "default" | "user-only" | "labeled-only" | "all";

export const TREE_FILTERS: TreeFilter[] = [
  "no-tools",
  "default",
  "user-only",
  "labeled-only",
  "all",
];

export const DEFAULT_TREE_FILTER: TreeFilter = "no-tools";

export const TREE_FILTER_LABEL: Record<TreeFilter, string> = {
  "no-tools": "no tools",
  default: "messages",
  "user-only": "user only",
  "labeled-only": "labeled",
  all: "everything",
};

export type TreeRole = "user" | "assistant" | "tool" | "summary" | "system";

export interface TreeRow {
  id: string;

  parentId: string | null;

  role: TreeRole;

  icon: IconName;

  text: string;

  meta: string;

  label?: string;

  active: boolean;

  leaf: boolean;

  search: string;
}

export interface TreeModel {
  rows: TreeRow[];
  graph: GraphNode[];
  laneCount: number;

  leafIndex: number;

  total: number;
}

interface MessageLike {
  role: string;
  content?: unknown;
  toolName?: string;
  isError?: boolean;
  stopReason?: string;
  model?: string;
  provider?: string;
}

const ROLE_ICON: Record<TreeRole, IconName> = {
  user: "person",
  assistant: "smartToy",
  tool: "terminal",
  summary: "contentCut",
  system: "info",
};

export const EMPTY_MODEL: TreeModel = {
  rows: [],
  graph: [],
  laneCount: 0,
  leafIndex: 0,
  total: 0,
};

const oneLine = (value: string, max = 160): string => fitOneLine(value, max);

function entryTime(entry: SessionEntry): string {
  const ts = (entry as { timestamp?: unknown }).timestamp;
  if (typeof ts !== "string" && typeof ts !== "number") return "";
  const date = new Date(ts);
  return Number.isNaN(date.getTime()) ? "" : relativeAge(date);
}

function toolText(msg: MessageLike): string {
  const out = contentToText(msg.content);
  const name = msg.toolName ?? "tool";
  return oneLine(out.length > 0 ? `${name} ${out}` : name);
}

interface EntryDescription {
  role: TreeRole;
  text: string;
  meta: string;
}

type EntryRow = { role: TreeRole; text: string };

type EntryKind = Exclude<SessionEntry["type"], "message">;

const ENTRY_ROWS: {
  [K in EntryKind]?: (entry: Extract<SessionEntry, { type: K }>) => EntryRow;
} = {
  compaction: (entry) => ({
    role: "summary",
    // A snapcompact entry's summary is a reading guide, not a sentence about the
    // session; its details say what was archived and how many pages it is on.
    text: isSnapcompactDetails(entry.details)
      ? detailsNote(entry.details)
      : `Compacted · ${oneLine(entry.summary)}`,
  }),
  branch_summary: (entry) => ({
    role: "summary",
    text: `Branch summary · ${oneLine(entry.summary)}`,
  }),
  model_change: (entry) => ({
    role: "system",
    text: `Model → ${entry.provider}/${entry.modelId}`,
  }),
  thinking_level_change: (entry) => ({
    role: "system",
    text: `Thinking → ${entry.thinkingLevel}`,
  }),
  session_info: (entry) => ({
    role: "system",
    text: `Name → ${entry.name ?? ""}`,
  }),
  label: (entry) => ({
    role: "system",
    text: `Label → ${entry.label ?? "(cleared)"}`,
  }),
  context_edit: (entry) => ({
    role: "system",
    text: `Context edit → ${entry.targetId}`,
  }),
  custom_message: (entry) => ({
    role: "system",
    text: `Custom · ${oneLine(contentToText(entry.content))}`,
  }),
  custom: (entry) => ({ role: "system", text: `Custom · ${entry.customType}` }),
  usage: (entry) => ({
    role: "system",
    text: `Usage · ${entry.kind} ${entry.provider}/${entry.model}`,
  }),
};

function describeMessage(msg: MessageLike, age: string): EntryDescription {
  const text = oneLine(contentToText(msg.content));
  if (msg.role === "user")
    return { role: "user", text: text || "(empty message)", meta: age };
  if (msg.role === "toolResult")
    return {
      role: "tool",
      text: toolText(msg),
      meta: msg.isError === true ? `error · ${age}` : age,
    };
  if (msg.role === "assistant") {
    const stopped =
      !!msg.stopReason &&
      msg.stopReason !== "stop" &&
      msg.stopReason !== "toolUse";
    return {
      role: "assistant",
      text: text || (stopped ? `(${msg.stopReason})` : "(tool calls)"),
      meta: msg.model ? `${msg.model} · ${age}` : age,
    };
  }
  return { role: "system", text: text || msg.role, meta: age };
}

export function describeEntry(entry: SessionEntry): EntryDescription {
  const age = entryTime(entry);
  if (entry.type === "message")
    return describeMessage(entry.message as unknown as MessageLike, age);
  const row = ENTRY_ROWS[entry.type as EntryKind] as
    ((entry: SessionEntry) => EntryRow) | undefined;
  return {
    ...(row?.(entry) ?? { role: "system", text: entry.type }),
    meta: age,
  };
}

function isBookkeeping(entry: SessionEntry): boolean {
  return (
    entry.type === "label" ||
    entry.type === "context_edit" ||
    entry.type === "custom" ||
    entry.type === "model_change" ||
    entry.type === "thinking_level_change" ||
    entry.type === "session_info"
  );
}

function messageOf(entry: SessionEntry): MessageLike {
  return (entry as { message?: MessageLike }).message ?? { role: "unknown" };
}

function hasToolCallOnlyText(entry: SessionEntry): boolean {
  const msg = messageOf(entry);
  if (msg === undefined) return false;
  return contentToText(msg.content).trim().length === 0;
}

function passesFilter(
  node: SessionTreeNode,
  filter: TreeFilter,
  leafId: string | null,
): boolean {
  const entry = node.entry;
  if (entry.type === "usage") return false;
  if (filter === "labeled-only")
    return node.label !== undefined && node.label.length > 0;
  if (filter === "all") return true;
  const isLeaf = leafId !== null && entry.id === leafId;
  if (entry.type === "message") {
    const role = messageOf(entry).role;
    if (role === "assistant" && !isLeaf && hasToolCallOnlyText(entry))
      return false;
    if (role === "toolResult" && filter === "no-tools") return false;
    if (filter === "user-only") return role === "user";
    return true;
  }
  if (filter === "user-only") return false;
  return !isBookkeeping(entry);
}

function timestampOf(node: SessionTreeNode): number {
  const ts = (node.entry as { timestamp?: unknown }).timestamp;
  const value =
    typeof ts === "string"
      ? Date.parse(ts)
      : typeof ts === "number"
        ? ts
        : Number.NaN;
  return Number.isFinite(value) ? value : 0;
}

export function flattenTree(
  roots: readonly SessionTreeNode[],
  leafId: string | null,
): SessionTreeNode[] {
  const active = new Map<SessionTreeNode, boolean>();
  const preOrder: SessionTreeNode[] = [];
  const walk: SessionTreeNode[] = [...roots];
  while (walk.length > 0) {
    const node = walk.pop() as SessionTreeNode;
    preOrder.push(node);
    for (const child of node.children) walk.push(child);
  }
  for (let i = preOrder.length - 1; i >= 0; i--) {
    const node = preOrder[i] as SessionTreeNode;
    let holds = leafId !== null && node.entry.id === leafId;
    for (const child of node.children)
      if (active.get(child) === true) holds = true;
    active.set(node, holds);
  }

  const rank = (node: SessionTreeNode): number =>
    (active.get(node) === true ? 1_000_000_000_000 : 0) + timestampOf(node);

  const pushChildren = (
    stack: SessionTreeNode[],
    nodes: readonly SessionTreeNode[],
  ): void => {
    for (const node of [...nodes].sort((a, b) => rank(b) - rank(a)))
      stack.push(node);
  };

  const pre: SessionTreeNode[] = [];
  const stack: SessionTreeNode[] = [];
  pushChildren(stack, roots);
  while (stack.length > 0) {
    const node = stack.pop() as SessionTreeNode;
    pre.push(node);
    pushChildren(stack, node.children);
  }

  return pre.reverse();
}

function emptyTreeModel(): TreeModel {
  return EMPTY_MODEL;
}

function pathNodes(
  tree: readonly SessionTreeNode[],
  id: string,
): SessionTreeNode[] {
  const byId = new Map<string, SessionTreeNode>();
  const walk = [...tree];
  while (walk.length > 0) {
    const node = walk.pop() as SessionTreeNode;
    if (!byId.has(node.entry.id)) byId.set(node.entry.id, node);
    for (const child of node.children) walk.push(child);
  }

  const chain: SessionTreeNode[] = [];
  const seen = new Set<string>();
  let cursor: string | null = id;
  while (cursor !== null && !seen.has(cursor)) {
    seen.add(cursor);
    const node = byId.get(cursor);
    if (node === undefined) break;
    chain.push(node);
    cursor = node.entry.parentId;
  }
  return chain.reverse();
}

export function pathMessages(
  tree: readonly SessionTreeNode[],
  id: string,
): unknown[] {
  const out: unknown[] = [];
  for (const node of pathNodes(tree, id)) {
    const entry = node.entry;
    if (entry.type === "message") out.push(entry.message);
  }
  return out;
}

export function pathStartTs(
  tree: readonly SessionTreeNode[],
  id: string,
): number | undefined {
  let oldest: number | undefined;
  for (const node of pathNodes(tree, id)) {
    const ts = timestampOf(node);
    if (ts > 0 && (oldest === undefined || ts < oldest)) oldest = ts;
  }
  return oldest;
}

function activePathOf(
  parentOf: ReadonlyMap<string, string | null>,
  leafId: string | null,
): Set<string> {
  const path = new Set<string>();
  let cursor = leafId;
  while (cursor !== null && cursor !== undefined) {
    path.add(cursor);
    cursor = parentOf.get(cursor) ?? null;
  }
  return path;
}

function nearestVisibleAncestor(
  id: string,
  parentOf: ReadonlyMap<string, string | null>,
  visibleIds: ReadonlySet<string>,
): string | null {
  let current = parentOf.get(id) ?? null;
  while (current !== null) {
    if (visibleIds.has(current)) return current;
    current = parentOf.get(current) ?? null;
  }
  return null;
}

const queryTokens = (query: string): string[] =>
  query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);

const rowSearchText = (
  described: EntryDescription,
  label: string | undefined,
  entryType: string,
): string =>
  `${described.text} ${described.meta} ${label ?? ""} ${entryType}`.toLowerCase();

const matchesQuery = (search: string, tokens: readonly string[]): boolean =>
  tokens.length === 0 || tokens.every((token) => search.includes(token));

// HOST is read inside the function, never at module scope: the host is still
// being built while these modules are pulled in, and a tool's mark is only ever
// asked for once every plugin has registered.
const rowIcon = (described: EntryDescription, entry: SessionEntry): IconName =>
  described.role === "tool"
    ? toolIconFor(HOST, messageOf(entry).toolName ?? "")
    : ROLE_ICON[described.role];

function leafIndexOf(
  rows: readonly TreeRow[],
  leafId: string | null,
  parentOf: ReadonlyMap<string, string | null>,
): number {
  const direct = rows.findIndex((row) => row.leaf);
  if (direct >= 0) return direct;
  let current = leafId;
  while (current !== null && current !== undefined) {
    const found = rows.findIndex((row) => row.id === current);
    if (found >= 0) return found;
    current = parentOf.get(current) ?? null;
  }
  return -1;
}

export function buildTreeModel(
  tree: readonly SessionTreeNode[],
  leafId: string | null,
  filter: TreeFilter = DEFAULT_TREE_FILTER,
  query = "",
): TreeModel {
  const flat = flattenTree(tree, leafId);
  if (flat.length === 0) return { ...EMPTY_MODEL };

  const parentOf = new Map<string, string | null>();
  for (const node of flat) parentOf.set(node.entry.id, node.entry.parentId);

  const visible = flat.filter((node) => passesFilter(node, filter, leafId));
  const visibleIds = new Set(visible.map((node) => node.entry.id));
  const activePath = activePathOf(parentOf, leafId);
  const tokens = queryTokens(query);

  const rows: TreeRow[] = [];
  for (const node of visible) {
    const entry = node.entry;
    const described = describeEntry(entry);
    const search = rowSearchText(described, node.label, entry.type);
    if (!matchesQuery(search, tokens)) continue;
    rows.push({
      id: entry.id,
      parentId: nearestVisibleAncestor(entry.id, parentOf, visibleIds),
      role: described.role,
      icon: rowIcon(described, entry),
      text: described.text,
      meta: described.meta,
      label: node.label,
      active: activePath.has(entry.id),
      leaf: leafId !== null && entry.id === leafId,
      search,
    });
  }

  const graph = generateGraphData(
    rows.map((row) => ({
      id: row.id,
      parents: row.parentId ? [row.parentId] : [],
    })),
  );

  return {
    rows,
    graph,
    laneCount: graphLaneCount(graph),
    leafIndex: Math.max(0, leafIndexOf(rows, leafId, parentOf)),
    total: visible.length,
  };
}
