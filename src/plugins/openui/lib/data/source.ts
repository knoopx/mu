/**
 * `Load(path)`: the one function of the language that reaches the disk.
 *
 * A library function of this engine is declared once — its signature is what the
 * prompt teaches and what the parser checks — and run at paint time, so a
 * program that names a file reads it on every paint of its own.
 * `lib/data/load.ts` does the reading (inside the window's folder, bounded,
 * cached against the file's mtime); this file is the language's half of it, plus
 * the complaints channel: a function of this engine returns a value and cannot
 * itself say why it returned nothing, so a failed read is recorded here and the
 * paint drains it into the program's notes, where `openui-state` prints it and a
 * row can show it. One recorder at a time is fine: the evaluator is synchronous,
 * so the failures of a paint are all in and all out before the next one starts.
 */

import { defineFunction } from "@openuidev/lang-core";
import { z } from "zod/v4";

import { loadFile } from "./load";

/** What one failed or clipped `Load` said, in order, for the paint in hand. */
let reports: string[] = [];

/** Open the recorder for one paint. */
export function beginLoadReport(): void {
  reports = [];
}

/** Every complaint the paints since `beginLoadReport` made — and then none, so a
 *  paint's notes are said once and a repaint starts from an empty page. */
export function takeLoadReports(): string[] {
  const said = reports;
  reports = [];
  return said;
}

/** The value `Load(path)` answers with, and what it says when there is none. */
export function loadValue(cwd: string, path: unknown): unknown {
  const name = typeof path === "string" ? path.trim() : "";
  if (name === "") {
    reports.push('Load(""): no file named');
    return null;
  }
  const read = loadFile(cwd, name);
  if (!read.ok) {
    reports.push(`Load("${name}"): ${read.error}`);
    return null;
  }
  if (read.note !== undefined) reports.push(read.note);
  return read.value;
}

/** The function as the library declares it, so the prompt, the parser and the
 *  renderer give the same answer about it. */
export const LOAD_FUNCTION = defineFunction({
  name: "Load",
  description:
    "read a file the agent saved in this folder — JSON, JSONL, CSV or TSV as a list or object, anything else as text; never retype values a file already holds",
  params: z.object({ path: z.string() }),
  returns: z.any(),
  fn: ({ path }) => loadValue(process.cwd(), path),
});
