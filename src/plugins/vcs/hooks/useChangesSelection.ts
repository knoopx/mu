/**
 * What the changes panel has its cursor on.
 *
 * One cursor sits on a change in the stack and another on a file inside it, and
 * a key acts on whichever half of the panel has the focus. Changes can also be
 * ticked — a describe takes everything ticked, or the selected change when
 * nothing is.
 */
import { useCallback, useEffect, useState } from "react";
import type { FilePanelFocus } from "../types";

export interface ChangesSelection {
  focus: FilePanelFocus;
  setFocus(focus: FilePanelFocus): void;

  checked: ReadonlySet<string>;
  toggleChecked(changeId: string): void;
  clearChecked(): void;
}

export function useChangesSelection(fileCount: number): ChangesSelection {
  const [focus, setFocus] = useState<FilePanelFocus>("stack");
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (fileCount === 0) setFocus("stack");
  }, [fileCount]);

  const toggleChecked = useCallback((changeId: string): void => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(changeId)) next.delete(changeId);
      else next.add(changeId);
      return next;
    });
  }, []);

  const clearChecked = useCallback((): void => {
    setChecked(new Set());
  }, []);

  return { focus, setFocus, checked, toggleChecked, clearChecked };
}
