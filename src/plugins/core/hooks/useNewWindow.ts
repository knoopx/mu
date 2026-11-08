import { useCallback } from "react";
import { spawnNewWindow } from "../../../window/newWindow";

export function useNewWindow(system: (text: string) => void): () => void {
  return useCallback((): void => {
    spawnNewWindow((message) => system(`New window failed: ${message}`));
  }, [system]);
}
