import { useCallback, useEffect, useRef, useState } from "react";

export type ResourceCache<T> = Map<string, T>;

export interface CachedResourceOptions<T> {
  cache: ResourceCache<T>;

  key: string;

  active: boolean;

  fallback: T;

  load: (report: (partial: T) => void) => Promise<T>;
}

export interface CachedResource<T> {
  data: T;

  loading: boolean;
  error: string | null;

  reload: () => void;

  invalidate: () => void;

  mutate: (update: (current: T) => T) => void;
}

export function useCachedResource<T>(
  options: CachedResourceOptions<T>,
): CachedResource<T> {
  const { cache, key, active, fallback, load } = options;
  const loadRef = useRef(load);
  loadRef.current = load;

  const [data, setData] = useState<T>(() => cache.get(key) ?? fallback);
  const dataRef = useRef(data);
  dataRef.current = data;
  const [loading, setLoading] = useState(() => !cache.has(key));
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const loadedRef = useRef<{ key: string; nonce: number } | null>(null);

  useEffect(() => {
    if (!active) return;
    const stamp = { key, nonce };
    const done = loadedRef.current;
    if (done !== null && done.key === key && done.nonce === nonce) return;
    let cancelled = false;
    if (!cache.has(key)) setLoading(true);
    const report = (partial: T): void => {
      if (!cancelled) setData(partial);
    };
    loadRef
      .current(report)
      .then((next) => {
        if (cancelled) return;
        loadedRef.current = stamp;
        cache.set(key, next);
        setData(next);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        loadedRef.current = stamp;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
      loadedRef.current = null;
    };
  }, [cache, key, active, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const invalidate = useCallback(() => {
    cache.delete(key);
    setNonce((n) => n + 1);
  }, [cache, key]);

  const mutate = useCallback(
    (update: (current: T) => T): void => {
      const next = update(dataRef.current);
      cache.set(key, next);
      setData(next);
      setNonce((n) => n + 1);
    },
    [cache, key],
  );

  return { data, loading, error, reload, invalidate, mutate };
}
