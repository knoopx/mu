import { useCallback, useEffect, useState } from "react";

import { type ProjectSummaryModel } from "../lib/project/projectSummary";
import { useProjectSource } from "../components/ProjectSource";

export interface ProjectSummaryState {
  summary: ProjectSummaryModel | null;

  loading: boolean;

  error: string | null;

  reload(): void;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function useProjectSummary(
  cwd: string,
  options: { active?: boolean; bookmark?: string } = {},
): ProjectSummaryState {
  const data = useProjectSource();
  const active = options.active !== false;
  const bookmark = options.bookmark;
  const [summary, setSummary] = useState<ProjectSummaryModel | null>(null);
  const [loading, setLoading] = useState(active);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback((): void => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!active) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void data
      .projectSummary(cwd)
      .then((next) => {
        if (cancelled) return;
        setSummary(next);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(messageOf(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cwd, active, nonce, bookmark, data]);

  return { summary, loading, error, reload };
}
