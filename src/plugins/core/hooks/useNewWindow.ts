import { useCallback } from "react";
import { spawnNewWindow } from "../../../window/newWindow";

export function useNewWindow(
  notify: (message: string) => void,
  system: (text: string) => void,
): () => void {
  return useCallback((): void => {
    const result = spawnNewWindow((message) =>
      system(`New window failed: ${message}`),
    );
    notify(`New window opened · ${result.args.join(" ")}`);
  }, [notify, system]);
}
