/**
 * Writing to the repo, and telling the reader what just happened.
 *
 * Every write goes through the same three steps: run it, say what it answered,
 * and re-read the panel so what is on screen is what jj now holds. Writes the
 * agent makes are not run here at all — the panel only says what it asked for.
 */
import { useCallback, useRef } from "react";
import type { ToastFn } from "adwaita-gpuix";
import { failMessage } from "../lib/repo";
import { type Change } from "adwaita-gpuix";
import type { StackData } from "./useChangeStackData";

export interface ChangeWritesOptions {
  toast: ToastFn;

  data: StackData;
}

export interface ChangeWrites {
  /** the change the cursor is on, read at the moment a key is handled */
  selectedChange(): Change | undefined;

  runMutation(fn: () => Promise<string>): Promise<void>;

  sentToAgent(what: string): void;
}

export function useChangeWrites(options: ChangeWritesOptions): ChangeWrites {
  const { toast } = options;

  const latest = useRef(options);
  latest.current = options;

  const selectedChange = useCallback((): Change | undefined => {
    const live = latest.current.data.live();
    return live.allChanges[live.sel];
  }, []);

  const runMutation = useCallback(
    async (fn: () => Promise<string>): Promise<void> => {
      const data = latest.current.data;
      try {
        const message = await fn();
        toast(message, { type: "success" });
        data.setError(null);
        await data.refresh();
      } catch (e) {
        const failure = failMessage(e);
        data.setError(failure);
        toast(failure, { type: "error" });
      }
    },
    [toast],
  );

  const sentToAgent = useCallback(
    (what: string): void => {
      toast(`${what} — sent to the agent`, { type: "info" });
    },
    [toast],
  );

  return { selectedChange, runMutation, sentToAgent };
}
