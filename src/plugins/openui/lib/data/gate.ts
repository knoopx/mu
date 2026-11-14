/**
 * The one gate a program's file name passes through before anything reads it.
 *
 * `Load`, a `Snippet`, an `Image` and the `Table` behind either one all ask the
 * same three questions of a name the program wrote: is it inside the window's
 * folder, is the file still there, and is it small enough to be a screen. Saying
 * the three once is what keeps a `Load` from reaching a path an `Image` could
 * not, and leaves each reader to word its own refusal — a picture that is too
 * big says MB, a log that is too big says KB.
 */

import { statSync } from "node:fs";

import { projectFile } from "../../../core/lib/files/projectPath";

/** One name a program gave, checked against the disk. */
export type FileGate =
  | {
      ok: true;
      /** The absolute path, the key a read is cached under. */
      target: string;
      /** The name as the program wrote it, which is what an error quotes. */
      name: string;
      mtimeMs: number;
      size: number;
    }
  /** Not inside the folder, a folder rather than a file, or no longer there. */
  | { ok: false; reason: "refused"; error: string }
  | { ok: false; reason: "too-big"; size: number };

/** Read one name against the window's folder, bounded by `maxBytes`. */
export function gateProjectFile(
  cwd: string,
  name: string,
  maxBytes: number,
): FileGate {
  const target = projectFile(cwd, name);
  if (!target.ok) return { ok: false, reason: "refused", error: target.error };

  let stats: ReturnType<typeof statSync>;
  try {
    stats = statSync(target.target);
  } catch {
    return { ok: false, reason: "refused", error: `${name} is already gone` };
  }
  if (stats.size > maxBytes)
    return { ok: false, reason: "too-big", size: stats.size };

  return {
    ok: true,
    target: target.target,
    name: target.name,
    mtimeMs: stats.mtimeMs,
    size: stats.size,
  };
}

/** The one wording for a file the gate passed and the disk still would not give up. */
export function unreadError(name: string, error: unknown): string {
  const reason = error instanceof Error ? error.message : String(error);
  return `${name} could not be read: ${reason}`;
}
