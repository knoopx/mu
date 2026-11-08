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

  const branch = useCallback(
    (direction: "up" | "down"): boolean => {
      if (rows.length === 0) return false;
      const indexById = new Map<string, number>();
      const childrenOf = new Map<string, string[]>();
      rows.forEach((row, index) => {
        indexById.set(row.id, index);
        if (row.parentId === null) return;
        const list = childrenOf.get(row.parentId) ?? [];
        list.push(row.id);
        childrenOf.set(row.parentId, list);
      });
      const current = rows[sel];
      if (current === undefined) return false;

      if (direction === "down") {
        let id = current.id;
        for (;;) {
          const children = childrenOf.get(id) ?? [];
          if (children.length === 0) return jump(indexById.get(id));
          if (children.length > 1) return jump(indexById.get(children[0]));
          id = children[0] as string;
        }
      }

      let id = current.id;
      for (;;) {
        const row = rows[indexById.get(id) ?? 0];
        const parent = row?.parentId ?? null;
        if (parent === null) return jump(indexById.get(id));
        const siblings = childrenOf.get(parent) ?? [];
        const index = indexById.get(id);
        if (siblings.length > 1 && index !== undefined && index < sel)
          return jump(index);
        id = parent;
      }
    },
    [rows, sel, jump],
  );

  const onKey = useCallback(
    (event: EventPayload): boolean => {
      if (!enabled || rows.length === 0) return false;
      const match = matchShortcut(TREE_SHORTCUTS, keyOf(event), modsOf(event));
      if (match === null) return false;
      switch (match.id) {
        case "up":
          return move(-1);
        case "down":
          return move(1);
        case "page-up":
          return page(-1);
        case "page-down":
          return page(1);
        case "home":
          return jump(0);
        case "end":
          return jump(rows.length - 1);
        case "branch-up":
          return branch("up");
        case "branch-down":
          return branch("down");
        case "filter-cycle":
          cycleFilter();
          return true;
        case "jump": {
          const row = rows[sel];
          if (row === undefined) return false;
          onNavigate(row);
          return true;
        }

        case "close":
          return false;
        default: {
          const next = TREE_FILTER_ACTION[match.id] as TreeFilter | undefined;
          if (next === undefined) return false;
          setFilterState(next === filter ? DEFAULT_TREE_FILTER : next);
          return true;
        }
      }
    },
    [
      branch,
      cycleFilter,
      enabled,
      filter,
      jump,
      move,
      onNavigate,
      page,
      rows,
      sel,
    ],
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
