/**
 * Running a panel's write, and telling the reader what just happened.
 *
 * Every write goes through the same three steps: run it, say what it answered,
 * and re-read the panel so what is on screen is what the repo now holds. Writes
 * the agent makes are not run here at all — the panel only says what it asked
 * for, and says so.
 */
import { useCallback, useRef } from "react";
import type { ToastFn } from "adwaita-gpuix";
import { failMessage } from "../lib/repo";

export interface RepoWritesOptions {
  toast: ToastFn;

  /** what to re-read once the write answered — the panel's own refresh */
  refresh(): Promise<void>;

  setError(message: string | null): void;
}

export interface RepoWrites {
  runMutation(fn: () => Promise<string>): Promise<void>;

  sentToAgent(what: string): void;
}

export function useRepoWrites(options: RepoWritesOptions): RepoWrites {
  const latest = useRef(options);
  latest.current = options;

  const runMutation = useCallback(
    async (fn: () => Promise<string>): Promise<void> => {
      const { toast, refresh, setError } = latest.current;
      try {
        const message = await fn();
        toast(message, { type: "success" });
        setError(null);
        await refresh();
      } catch (e) {
        const failure = failMessage(e);
        setError(failure);
        toast(failure, { type: "error" });
      }
    },
    [],
  );

  const sentToAgent = useCallback((what: string): void => {
    latest.current.toast(`${what} — sent to the agent`, { type: "info" });
  }, []);

  return { runMutation, sentToAgent };
}
