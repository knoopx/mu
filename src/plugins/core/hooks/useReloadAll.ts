/**
 * Re-reading what the window lists.
 *
 * A session that changes — a new one, a resume, a rename — changes what the
 * session panel and the user-message panel can show, so both are re-read
 * together. The callback that does it is handed to the session before the
 * panels that answer it exist, which is why it is a reference the panels fill
 * in when they mount.
 */
import { useCallback, useRef } from "react";

export interface ReloadAll {
  /** what the app calls when a session leaves the lists out of date */
  changed(): void;

  /** what the panels call to say what a reload means */
  note(reload: () => void): void;
}

export function useReloadAll(): ReloadAll {
  const reloadRef = useRef<() => void>(() => {});

  const changed = useCallback((): void => {
    reloadRef.current();
  }, []);

  const note = useCallback((reload: () => void): void => {
    reloadRef.current = reload;
  }, []);

  return { changed, note };
}
