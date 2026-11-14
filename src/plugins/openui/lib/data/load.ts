/**
 * Reading a file a program names: `Load("reports/tests.json")`.
 *
 * The reference plugin's central idea is that a component reads what a tool
 * printed instead of the model retyping it, and the same idea holds here: a
 * `Table` of 200 rows costs the model nothing when the rows are already on disk.
 * So a program may name a file, and this file is the only thing that turns that
 * name into a value.
 *
 * Three bounds, all of them the reference's reasoning rather than mu's:
 *
 * - **Inside the window's folder.** A program's name goes through the same read
 *   every file panel row already runs through (`projectFile`), so a name that
 *   walks out of the project is refused the same way in a screen as in a panel,
 *   and nothing a program draws can reach the disk outside the folder the window
 *   works in.
 * - **Bounded bytes.** A log is a fact and a 40 MB core dump is not a screen.
 * - **Parsed by kind.** JSON, JSONL, CSV and TSV arrive as lists and objects,
 *   which is what a `Table`'s rows and a `Chart`'s series are written as;
 *   anything else arrives as text, which is what a `Code` block prints.
 *
 * A read is cached against the file's own mtime, so a program repainted on every
 * keystroke of a slider does not touch the disk again, and a file the agent
 * rewrote since is read again.
 */

import { readFileSync, statSync } from "node:fs";
import { extname } from "node:path";

import { projectFile } from "../../../core/lib/files/projectPath";

/** The largest file a program may read. Past this the file is not a screen. */
export const MAX_LOAD_BYTES = 512 * 1024;

/** How much of a plain-text file arrives as text; the rest is left off. */
export const MAX_LOAD_TEXT_CHARS = 64_000;

/** One answer of a `Load` call: the value, or why there is none. */
export type LoadResult =
  | { ok: true; value: unknown; note?: string }
  | { ok: false; error: string };

/** What one `Load` path answered, and when the file last changed. */
interface LoadCacheEntry {
  mtimeMs: number;
  size: number;
  result: LoadResult;
}

const cache = new Map<string, LoadCacheEntry>();

/** A file changed on disk, or the agent served new data: forget what was read. */
export function invalidateLoads(): void {
  cache.clear();
}

/** Lines of a file, numbered from 1, bounded however wide the reader asked for. */
export function readFileLines(
  cwd: string,
  name: string,
  from: number,
  to: number,
): 
  | {
      ok: true;
      lines: string[];
      first: number;
      last: number;
      total: number;
    }
  | { ok: false; error: string } {
  const target = projectFile(cwd, name);
  if (!target.ok) return { ok: false, error: target.error };

  let stats: ReturnType<typeof statSync>;
  try {
    stats = statSync(target.target);
  } catch {
    return { ok: false, error: `${target.name} is already gone` };
  }
  if (stats.size > MAX_LOAD_BYTES)
    return {
      ok: false,
      error: `${target.name} is ${String(Math.round(stats.size / 1024))} KB — over what a program reads`,
    };

  try {
    const all = readFileSync(target.target, "utf8").split(/\r?\n/);
    const first = Math.max(1, Math.floor(from));
    const last = Math.max(first, Math.floor(to));
    const lines = all.slice(first - 1, last);
    return {
      ok: true,
      lines,
      first,
      last: first + lines.length - 1,
      total: all.length,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `${target.name} could not be read: ${reason}` };
  }
}

/** What kind of value a name is read as, from its own extension. */
export const loadKindOf = (name: string): "json" | "jsonl" | "csv" | "tsv" | "text" => {
  const extension = extname(name.trim()).toLowerCase();
  if (extension === ".json" || extension === ".jsonc") return "json";
  if (extension === ".jsonl" || extension === ".ndjson") return "jsonl";
  if (extension === ".csv") return "csv";
  if (extension === ".tsv") return "tsv";
  return "text";
};

/** Split one CSV/TSV line, honouring a quoted field that holds the separator. */
function splitDelimited(line: string, separator: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let at = 0; at < line.length; at += 1) {
    const char = line[at];
    if (quoted) {
      if (char === '"') {
        if (line[at + 1] === '"') {
          cell += '"';
          at += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === separator) {
      cells.push(cell);
      cell = "";
      continue;
    }
    cell += char;
  }
  cells.push(cell);
  return cells;
}

/** A delimited file, read as a list of objects keyed by its header row. */
export function parseDelimited(text: string, separator: string): Record<string, string>[] {
  const rows = text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line) => splitDelimited(line, separator));
  if (rows.length === 0) return [];

  const header = rows[0];
  return rows.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    header.forEach((key, index) => {
      row[key === "" ? `column${String(index + 1)}` : key] = cells[index] ?? "";
    });
    return row;
  });
}

/** One line of a JSONL file, or the plain value when the line is not an object. */
function parseJsonLine(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return line;
  }
}

const parseJson = (text: string): unknown => JSON.parse(text);

/** Read one name, inside the window's folder, as the value it holds. */
export function loadFile(cwd: string, name: string): LoadResult {
  const target = projectFile(cwd, name);
  if (!target.ok) return { ok: false, error: target.error };

  let stats: ReturnType<typeof statSync>;
  try {
    stats = statSync(target.target);
  } catch {
    return { ok: false, error: `${target.name} is already gone` };
  }
  if (stats.size > MAX_LOAD_BYTES)
    return {
      ok: false,
      error: `${target.name} is ${String(Math.round(stats.size / 1024))} KB — over what a program reads`,
    };

  const held = cache.get(target.target);
  if (
    held !== undefined &&
    held.mtimeMs === stats.mtimeMs &&
    held.size === stats.size
  )
    return held.result;

  const kind = loadKindOf(target.name);
  let result: LoadResult;

  try {
    const text = readFileSync(target.target, "utf8");
    if (kind === "text") {
      const clipped = text.length > MAX_LOAD_TEXT_CHARS;
      result = {
        ok: true,
        value: clipped ? text.slice(0, MAX_LOAD_TEXT_CHARS) : text,
        ...(clipped ? { note: `${target.name} read up to ${String(MAX_LOAD_TEXT_CHARS)} characters` } : {}),
      };
    } else if (kind === "json") {
      result = { ok: true, value: parseJson(text) };
    } else if (kind === "jsonl") {
      result = {
        ok: true,
        value: text
          .split(/\r?\n/)
          .filter((line) => line.trim() !== "")
          .map(parseJsonLine),
      };
    } else {
      result = {
        ok: true,
        value: parseDelimited(text, kind === "tsv" ? "\t" : ","),
      };
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    result = {
      ok: false,
      error:
        kind === "json" || kind === "jsonl"
          ? `${target.name} is not readable ${kind}: ${reason}`
          : `${target.name} could not be read: ${reason}`,
    };
  }

  cache.set(target.target, { mtimeMs: stats.mtimeMs, size: stats.size, result });
  return result;
}
