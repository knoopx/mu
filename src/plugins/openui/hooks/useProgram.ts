/**
 * Reading the program store from a component.
 *
 * The store is not React state: a program outlives the row that drew it and is
 * written by tool calls that have no component of their own. So a screen
 * subscribes to it, and the version counter is what makes the subscription a
 * re-render.
 */

import { useSyncExternalStore } from "react";

import { programStore, type ProgramRecord } from "../lib/programStore/store";

/** The store's version: every write to it bumps it. */
function useProgramStoreVersion(): number {
  return useSyncExternalStore(
    programStore.subscribe,
    programStore.getSnapshot,
    programStore.getSnapshot,
  );
}

/** One program in the log, or nothing when it is no longer drawn. */
export function useProgram(name: string): ProgramRecord | undefined {
  useProgramStoreVersion();
  return programStore.get(name);
}
