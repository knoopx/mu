import { lstatSync, unlinkSync } from "node:fs";
import { resolve, sep } from "node:path";

export interface FileDeleteResult {
  ok: boolean;
  error?: string;
}

/**
 * Take one of the project's files off the disk, as the panel labels it.
 *
 * The name is relative to the folder the panel lists, and it stays inside that
 * folder: a name that walks out of it, or names the folder itself, is refused
 * rather than removed, because the panel's rows are project files and nothing
 * else. The file is unlinked, not moved to trash, so the toast that says which
 * file went is the whole record of the act.
 */
export function deleteFile(cwd: string, path: string): FileDeleteResult {
  const name = path.trim();
  if (name === "") return { ok: false, error: "No file under the cursor" };

  const root = resolve(cwd);
  const target = resolve(root, name);
  if (target === root || !target.startsWith(root + sep))
    return { ok: false, error: `${name} is not inside this folder` };

  let stats: ReturnType<typeof lstatSync>;
  try {
    stats = lstatSync(target);
  } catch {
    return { ok: false, error: `${name} is already gone` };
  }
  if (stats.isDirectory()) return { ok: false, error: `${name} is a folder` };

  try {
    unlinkSync(target);
    return { ok: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, error: reason };
  }
}
