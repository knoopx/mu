/**
 * Move mode.
 *
 * Moving a change in the stack is a mode rather than a key: Enter reorders the
 * list, and the list only becomes a jj rebase when the move is confirmed. The
 * panel keeps its own copy of the rows while moving so the reader can see the
 * rebase they are about to ask for.
 */
import { useCallback, useRef, useState } from "react";
import type { ToastFn } from "adwaita-gpuix";
import { rebaseChange } from "../lib/repo";
import { moveLanding, swapRow } from "../lib/moveStack";
import { type Change } from "adwaita-gpuix";
import { PanelMode } from "../types";

export interface ChangesMoveOptions {
  toast: ToastFn;

  /** the stack as the panel shows it, and where the cursor sits on it */
  rows(): Change[];
  sel(): number;

  setSel(index: number): void;

  runMutation(fn: () => Promise<string>): Promise<void>;
}

export interface ChangesMove {
  mode: PanelMode;
  moveRows: Change[];

  /** the list a key moves through: the copy being reordered, or the stack */
  shown(): Change[];

  enter(): void;
  cancel(): void;
  swap(from: number, to: number): void;
  apply(): Promise<void>;
}

export function useChangesMove(options: ChangesMoveOptions): ChangesMove {
  const [mode, setMode] = useState<PanelMode>("normal");
  const [moveRows, setMoveRows] = useState<Change[]>([]);
  const [moveOrigin, setMoveOrigin] = useState(0);

  const latest = useRef(options);
  latest.current = options;
  const movingRef = useRef({ mode, moveRows, moveOrigin });
  movingRef.current = { mode, moveRows, moveOrigin };

  const enter = useCallback((): void => {
    setMode("move");
    setMoveRows(latest.current.rows());
    setMoveOrigin(latest.current.sel());
    latest.current.toast(
      "Move mode — up/down to place, Enter to rebase, Esc to cancel",
      { type: "info" },
    );
  }, []);

  const cancel = useCallback((): void => {
    setMode("normal");
    setMoveRows([]);
    latest.current.setSel(movingRef.current.moveOrigin);
  }, []);

  const swap = useCallback((from: number, to: number): void => {
    setMoveRows((prev) => swapRow(prev, from, to) ?? prev);
  }, []);

  const apply = useCallback(async (): Promise<void> => {
    const from = movingRef.current.moveOrigin;
    const to = latest.current.sel();
    if (from === to) {
      cancel();
      return;
    }
    const landing = moveLanding(movingRef.current.moveRows, from, to);
    if (landing === null) {
      latest.current.toast("Cannot move to the top or bottom of the stack", {
        type: "warning",
      });
      return;
    }
    await latest.current.runMutation(() =>
      rebaseChange(
        landing.moved.change_id,
        landing.target.change_id,
        landing.after,
      ),
    );
    cancel();
  }, [cancel]);

  const shown = useCallback(
    (): Change[] =>
      movingRef.current.mode === "move"
        ? movingRef.current.moveRows
        : latest.current.rows(),
    [],
  );

  return { mode, moveRows, shown, enter, cancel, swap, apply };
}
