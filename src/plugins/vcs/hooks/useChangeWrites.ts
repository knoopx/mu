/**
 * The changes panel's half of a write: which change it stands on.
 *
 * Running the write, answering it and re-reading the panel are the same for
 * every panel — see useRepoWrites. What is specific here is knowing the change
 * the cursor is on at the moment a key is handled, which is the row a describe,
 * a squash or a drop names.
 */
import { useCallback, useRef } from "react";
import type { ToastFn } from "adwaita-gpuix";
import { type Change } from "adwaita-gpuix";
import { useRepoWrites } from "./useRepoWrites";
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
  const latest = useRef(options);
  latest.current = options;

  const writes = useRepoWrites({
    toast: options.toast,
    refresh: () => latest.current.data.refresh(),
    setError: (message: string | null): void =>
      latest.current.data.setError(message),
  });

  const selectedChange = useCallback(
    (): Change | undefined => {
      const live = latest.current.data.live();
      return live.allChanges[live.sel];
    },
    [],
  );

  return {
    selectedChange,
    runMutation: writes.runMutation,
    sentToAgent: writes.sentToAgent,
  };
}
