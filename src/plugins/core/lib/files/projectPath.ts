import { lstatSync } from "node:fs";
import { resolve, sep } from "node:path";

export type ProjectFileRead =
  { ok: true; name: string; target: string } | { ok: false; error: string };

/**
 * One panel row, read as the file it claims to be.
 *
 * A panel lists the project by names relative to the folder it walks, and every
 * thing the panel can do to a row — insert it, delete it, hand it to an editor —
 * has to agree on what such a name may point at: it stays inside that folder, it
 * is not the folder itself, and it is a file and not a directory. One read says
 * it, so a refusal is worded the same whichever key asked for it and a name that
 * walks out of the folder cannot reach the disk through any of them.
 */
export function projectFile(cwd: string, path: string): ProjectFileRead {
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

  return { ok: true, name, target };
}
