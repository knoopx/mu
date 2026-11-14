import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGpuixRequired, type PublicInstance } from "@gpuix/react";
import { useListFollow } from "adwaita-gpuix";
import type { EventPayload } from "@gpuix/native";
import type { SessionTreeNode } from "@earendil-works/pi-coding-agent";
import type { TreeSnapshot } from "../lib/session/chatSession";
import {
  buildTreeModel,
  DEFAULT_TREE_FILTER,
  EMPTY_MODEL,
  indexRows,
  TREE_FILTER_LABEL,
  TREE_FILTERS,
  type TreeFilter,
  type TreeModel,
  type TreeRow,
} from "../lib/session/sessionTree";
import {
  TREE_FILTER_ACTION,
  TREE_SHORTCUTS,
  matchShortcut,
} from "../lib/session/shortcuts";
import { keyOf, modsOf } from "../lib/ui/keyEvents";
import { clamp } from "../../../utils/clamp";
import { ROW_HEIGHT } from "../lib/ui/tokens";

const PAGE_ROWS = 8;

interface TreeData {
  tree: SessionTreeNode[] | null;
  leafId: string | null;
}

export interface SessionTreeOptions {
  data: TreeSnapshot | null;

  enabled: boolean;

  query: string;

  onNavigate: (row: TreeRow) => void;
}

export interface SessionTreeApi extends TreeModel {
  filter: TreeFilter;

  filterLabel: string;
  tree: SessionTreeNode[];
  leafId: string | null;
  sel: number;
  selected: TreeRow | null;
  listRef: { current: PublicInstance | null };
  select(index: number): void;
  setFilter(filter: TreeFilter): void;
  cycleFilter(): void;

  onKey(event: EventPayload): boolean;
}

export function useSessionTree(options: SessionTreeOptions): SessionTreeApi {
  const { data, enabled, query, onNavigate } = options;
  const renderer = useGpuixRequired();
  const listRef = useRef<PublicInstance | null>(null);
  const ensureVisible = useListFollow(listRef, renderer, ROW_HEIGHT);

  const [filter, setFilterState] = useState<TreeFilter>(DEFAULT_TREE_FILTER);
  const [sel, setSel] = useState(0);

  const snapshot = useMemo<TreeData>(() => {
    if (!enabled || data === null) return { tree: null, leafId: null };
    return { tree: data.tree, leafId: data.leafId };
  }, [enabled, data]);

  const model = useMemo(
    () =>
      snapshot.tree === null
        ? { ...EMPTY_MODEL }
        : buildTreeModel(snapshot.tree, snapshot.leafId, filter, query),
    [snapshot, filter, query],
  );

  const rows = model.rows;
  const rowsKey = `${rows.length}:${rows[0]?.id ?? ""}:${rows[rows.length - 1]?.id ?? ""}`;

  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = rows[sel]?.id ?? null;

  useLayoutEffect(() => {
    if (rows.length === 0) return;
    const keep = rows.findIndex((row) => row.id === selectedIdRef.current);
    const next = keep >= 0 ? keep : model.leafIndex;
    setSel((prev) => (prev === next ? prev : next));
  }, [rowsKey, model.leafIndex]);

  useEffect(() => {
    if (rows.length > 0) ensureVisible(sel);
  }, [sel, rowsKey, rows.length, ensureVisible]);

  const select = useCallback((index: number): void => {
    setSel(Math.max(0, index));
  }, []);

  const move = useCallback(
    (delta: number): boolean => {
      if (rows.length === 0) return false;
      setSel((prev) => (prev + delta + rows.length) % rows.length);
      return true;
    },
    [rows.length],
  );

  const page = useCallback(
    (delta: number): boolean => {
      if (rows.length === 0) return false;
      setSel((prev) => clamp(prev + delta * PAGE_ROWS, rows.length - 1));
      return true;
    },
    [rows.length],
  );

  const jump = useCallback((index: number | undefined): boolean => {
    if (index === undefined) return false;
    setSel(index);
    return true;
  }, []);

  const setFilter = useCallback((next: TreeFilter): void => {
    setFilterState(next);
  }, []);

  const cycleFilter = useCallback((): void => {
    setFilterState(
      (prev) =>
        TREE_FILTERS[(TREE_FILTERS.indexOf(prev) + 1) % TREE_FILTERS.length],
    );
  }, []);

  // The branch keys walk the model's parent links; the model is built once, so
  // the walk reads an index built once with it rather than rebuilding a map of
  // every row on each keypress.
  const index = useMemo(() => indexRows(rows), [rows]);

  /** Down the branch the cursor stands on: to its first child, straight through
   *  any parent that has only the one, until the cursor reaches a fork or a leaf. */
  const descend = useCallback((): boolean => {
    const current = rows[sel];
    if (current === undefined) return false;
    let id = current.id;
    for (;;) {
      const children = index.childrenOf.get(id) ?? [];
      if (children.length !== 1) return jump(index.at.get(children[0] ?? id));
      id = children[0] as string;
    }
  }, [index, jump, rows, sel]);

  /** Up the branch: to the nearest parent with a sibling still to read below the
   *  cursor, so a run of one-child rows is a single jump rather than ten. */
  const ascend = useCallback((): boolean => {
    const current = rows[sel];
    if (current === undefined) return false;
    let id = current.id;
    for (;;) {
      const parent = rows[index.at.get(id) ?? 0]?.parentId ?? null;
      if (parent === null) return jump(index.at.get(id));
      const siblings = index.childrenOf.get(parent) ?? [];
      const at = index.at.get(id);
      if (siblings.length > 1 && at !== undefined && at < sel) return jump(at);
      id = parent;
    }
  }, [index, jump, rows, sel]);

  /** Enter hands the row under the cursor to whoever opened the tree. */
  const jumpHere = useCallback((): boolean => {
    const row = rows[sel];
    if (row === undefined) return false;
    onNavigate(row);
    return true;
  }, [onNavigate, rows, sel]);

  /** A key that is not the cursor's is one of the view's five filters; pressing
   *  the one already showing turns it off again. */
  const pickFilter = useCallback(
    (id: string): boolean => {
      const next = TREE_FILTER_ACTION[id] as TreeFilter | undefined;
      if (next === undefined) return false;
      setFilterState(next === filter ? DEFAULT_TREE_FILTER : next);
      return true;
    },
    [filter],
  );

  /** What each of the tree's keys does to the cursor. */
  const keyActions = useMemo<Record<string, () => boolean>>(
    () => ({
      up: () => move(-1),
      down: () => move(1),
      "page-up": () => page(-1),
      "page-down": () => page(1),
      home: () => jump(0),
      end: () => jump(rows.length - 1),
      "branch-up": () => ascend(),
      "branch-down": () => descend(),
      "filter-cycle": () => {
        cycleFilter();
        return true;
      },
      jump: jumpHere,
      // Escape is the window's to answer, not the tree's.
      close: () => false,
    }),
    [
      ascend,
      cycleFilter,
      descend,
      jump,
      jumpHere,
      move,
      page,
      rows.length,
    ],
  );

  const onKey = useCallback(
    (event: EventPayload): boolean => {
      if (!enabled || rows.length === 0) return false;
      const match = matchShortcut(TREE_SHORTCUTS, keyOf(event), modsOf(event));
      if (match === null) return false;
      const act = keyActions[match.id];
      return act === undefined ? pickFilter(match.id) : act();
    },
    [enabled, keyActions, pickFilter, rows.length],
  );

  return {
    ...model,
    filter,
    filterLabel: TREE_FILTER_LABEL[filter],
    tree: snapshot.tree ?? [],
    leafId: snapshot.leafId,
    sel,
    selected: rows[sel] ?? null,
    listRef,
    select,
    setFilter,
    cycleFilter,
    onKey,
  };
}
