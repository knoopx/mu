import { useCallback, useEffect, useState } from "react";
import type { DiffRow, DiffToken } from "adwaita-gpuix";
import { diffTokensOf, type PatchTokens } from "../lib/syntax/diff";

/**
 * The colour of a patch's rows, as it arrives.
 *
 * Reading the text happens off the render, so the rows are drawn at once in one
 * colour and painted again when the read answers; a patch that never answers is
 * a patch drawn plain, which is still a diff that says what changed.
 *
 * `rows` must be the array the pane draws from — the same `diffRowsOf` result —
 * because the answer is keyed to those rows.
 */
export function useDiffTokens(
  rows: readonly DiffRow[],
): (row: DiffRow) => DiffToken[] | undefined {
  const [tokens, setTokens] = useState<PatchTokens>({});

  useEffect(() => {
    let live = true;
    setTokens({});
    void diffTokensOf(rows)
      .then((next) => {
        if (live) setTokens(next);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [rows]);

  return useCallback((row: DiffRow) => tokens[row.id], [tokens]);
}
