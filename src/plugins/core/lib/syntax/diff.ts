import type { DiffRow, DiffToken } from "adwaita-gpuix";
import { diffHunkRows } from "adwaita-gpuix";

import { languageOfPath } from "../../../guardrails/lib/treeSitter/source";
import { highlightLines } from "./parse";

/**
 * Reading a patch as code.
 *
 * A patch does not hold a program: it holds one hunk of a file at a time, and
 * the line that changed is only meaningful inside the lines around it. So each
 * hunk is read twice — the file as it was, made of the context and the removed
 * lines, and the file as it is now, made of the context and the added ones — and
 * the tokens come back to the rows they came from. Context that is not drawn
 * still does its job here: it is what lets a line in the middle of a function
 * parse as part of one.
 *
 * The rows are keyed by their own id, so the answer arrives whether or not the
 * pane is drawing that part of the patch yet.
 */

/** A patch's colour, by row id. */
export type PatchTokens = Record<string, DiffToken[]>;

/** Hunks of one patch read before the rest are left in one colour. */
const MAX_HUNKS = 64;

/** Wall time spent reading one patch, after which the rest is left plain. */
const READ_BUDGET_MS = 250;

const sidesOf = (rows: readonly DiffRow[], side: "old" | "new"): DiffRow[] =>
  rows.filter(
    (row) =>
      row.kind === "ctx" ||
      (side === "old" ? row.kind === "del" : row.kind === "add"),
  );

async function readSide(
  rows: readonly DiffRow[],
  path: string,
  tokens: PatchTokens,
): Promise<void> {
  const language = languageOfPath(path);
  if (language === null || rows.length === 0) return;

  const lines = await highlightLines(
    rows.map((row) => row.text).join("\n"),
    language,
  );
  if (lines === null) return;

  for (let i = 0; i < rows.length; i++) {
    const runs = lines[i];
    const row = rows[i];
    if (row === undefined || runs === undefined || runs.length === 0) continue;
    tokens[row.id] = runs;
  }
}

/** Every row of a patch, read as the language its file is written in. */
export async function diffTokensOf(
  rows: readonly DiffRow[],
): Promise<PatchTokens> {
  const tokens: PatchTokens = {};
  const hunks = [...diffHunkRows(rows).values()].slice(0, MAX_HUNKS);
  const deadline = Date.now() + READ_BUDGET_MS;

  for (const hunk of hunks) {
    if (Date.now() > deadline) break;
    const path = hunk[0]?.path ?? "";
    await readSide(sidesOf(hunk, "new"), path, tokens);
    await readSide(sidesOf(hunk, "old"), path, tokens);
  }

  return tokens;
}
