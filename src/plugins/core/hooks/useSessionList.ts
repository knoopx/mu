import { useCallback, useEffect, useRef } from "react";
import { useCachedResource } from "./useCachedResource";
import type { SessionDeleteResult } from "../lib/agent/agentService";
import type {
  SessionList,
  SessionListRow,
  SessionPreviewData,
} from "../lib/session/sessionList";

const rowCache = new Map<string, SessionListRow[]>();
const NO_ROWS: SessionListRow[] = [];

export interface SessionListState {
  rows: SessionListRow[];
  loading: boolean;
  error: string | null;

  preview(row: SessionListRow | undefined): SessionPreviewData | null;
  remove(path: string): SessionDeleteResult;
  reload(): void;
}

export function useSessionList(
  list: SessionList,
  cwd: string,
  active: boolean,
): SessionListState {
  const { data, loading, error, reload, mutate } = useCachedResource<
    SessionListRow[]
  >({
    cache: rowCache,
    key: cwd,
    active,
    fallback: NO_ROWS,
    load: () => list.rows(cwd),
  });

  const listRef = useRef(list);
  listRef.current = list;
  const previewRef = useRef<{ path: string; spec: SessionPreviewData } | null>(
    null,
  );

  const preview = useCallback(
    (row: SessionListRow | undefined): SessionPreviewData | null => {
      if (row === undefined) return null;
      const cached = previewRef.current;
      if (cached !== null && cached.path === row.path) return cached.spec;
      const spec = listRef.current.preview(row, cwd);
      previewRef.current = { path: row.path, spec };
      return spec;
    },
    [cwd],
  );

  const remove = useCallback(
    (path: string): SessionDeleteResult => {
      const result = listRef.current.remove(path);
      if (result.ok) mutate((rows) => rows.filter((row) => row.path !== path));
      return result;
    },
    [mutate],
  );

  useEffect(() => {
    previewRef.current = null;
  }, [cwd]);

  return { rows: data, loading, error, preview, remove, reload };
}
