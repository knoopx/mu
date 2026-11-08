/**
 * The rendered programs as React state.
 *
 * `lib/programStore.ts` is a plain store; this is the one hook the log reads it
 * through, so a tool row re-paints when a program arrives, when the renderer
 * publishes what it saw, and when the human touches the program.
 */

import { useSyncExternalStore } from "react";

import {
  programStore,
  type ProgramSnapshot,
} from "../lib/programStore";

export function useProgramSnapshot(): ProgramSnapshot {
  return useSyncExternalStore(
    programStore.subscribe,
    programStore.getSnapshot,
    programStore.getSnapshot,
  );
}

/**
 * Whether this tool call is still the one that owns its program. The newest
 * render of a name paints it; every older row for that name is a record of
 * what that call sent, and paints no program of its own.
 */
export function useProgramOwner(name: string, toolCallId: string): boolean {
  const snapshot = useProgramSnapshot();
  return snapshot.programs[name]?.owner === toolCallId;
}
