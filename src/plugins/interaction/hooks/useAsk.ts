import { useEffect, useSyncExternalStore } from "react";
import { askStore } from "../lib/store";
import type { AskSnapshot } from "../types";

export function useAskSnapshot(): AskSnapshot {
  return useSyncExternalStore(
    askStore.subscribe,
    askStore.getSnapshot,
    askStore.getSnapshot,
  );
}

export function useAskUiHost(): void {
  useEffect(() => askStore.mountUi(), []);
}
