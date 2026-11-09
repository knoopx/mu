import { unlinkSync } from "node:fs";
import { projectFile } from "./projectPath";

export interface FileDeleteResult {
  ok: boolean;
  error?: string;
}

/**
 * Take one of the project's files off the disk, as the panel labels it.
 *
 * What a row may name is the same answer every row action gives — see
 * `projectPath.ts` — so the guard here is that read, and the only thing a delete
 * adds is the act. The file is unlinked, not moved to trash, so the toast that
 * says which file went is the whole record of the act.
 */
export function deleteFile(cwd: string, path: string): FileDeleteResult {
  const file = projectFile(cwd, path);
  if (!file.ok) return file;

  try {
    unlinkSync(file.target);
    return { ok: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, error: reason };
  }
}
