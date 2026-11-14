/**
 * The projects panel's own store, for a scene that can be photographed.
 *
 * The panel lists the folders mu has sessions in, and the real store's ages
 * move: the same window would print `2h` now and `3h` at dinner, and a PNG that
 * lies about when is worse than no PNG. So the scene writes a store in exactly
 * the shape pi writes — one folder per working directory, one `.jsonl` per
 * session, the `cwd` in the first line of the newest one — into the temp dir,
 * stamps every file an age sitting well inside the age the panel will print,
 * and points `MU_PROJECTS_STORE` at it. That one variable is read by the
 * projects plugin and nobody else, so staging it cannot move any other scene.
 *
 * The folders are real ones on the machine that captures: the panel drops a
 * project whose path the disk no longer holds, and a scene that invented paths
 * would photograph an empty list.
 */

import { mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROJECTS_STORE_ENV } from "../../src/plugins/projects/constants";

interface SceneProject {
  /** a folder this machine actually holds, because the panel checks it does */
  path: string;
  /** how many sessions the row counts */
  sessions: number;
  /** how long ago the newest was written, in minutes: kept clear of a bucket edge */
  ageMin: number;
}

const HOME = "/home/knoopx";

const SCENE_PROJECTS: SceneProject[] = [
  { path: `${HOME}/Projects/gpuix-apps/mu`, sessions: 41, ageMin: 0.5 },
  { path: `${HOME}/Projects/gpuix-apps/storybook`, sessions: 6, ageMin: 100 },
  { path: `${HOME}/Projects/knoopx/nix`, sessions: 24, ageMin: 115 },
  {
    path: `${HOME}/Projects/gpuix-apps/adwaita-gpuix`,
    sessions: 12,
    ageMin: 180,
  },
  { path: `${HOME}/Projects/knoopx/astal-shell`, sessions: 3, ageMin: 1_080 },
  { path: `${HOME}/.pi`, sessions: 12, ageMin: 3_020 },
  { path: `${HOME}/Projects/knoopx/deskfield`, sessions: 2, ageMin: 3_100 },
  { path: `${HOME}/Projects/knoopx/papers`, sessions: 3, ageMin: 3_240 },
  { path: `${HOME}/Projects/knoopx/diffusion`, sessions: 4, ageMin: 4_500 },
  { path: `${HOME}/Projects/gpuix-apps/mermaid`, sessions: 2, ageMin: 8_400 },
  { path: `${HOME}/Projects/gpuix-apps/strudel`, sessions: 1, ageMin: 7_900 },
  { path: `${HOME}/Projects/gpuix-apps/changes`, sessions: 9, ageMin: 9_000 },
  { path: `${HOME}/Projects/knoopx/splatcraft`, sessions: 1, ageMin: 11_800 },
  { path: `${HOME}/Projects/knoopx/pico8-studio`, sessions: 5, ageMin: 13_000 },
];

/** pi's own spelling of a path as a folder name — `/` and `-` both become `-`. */
const encodeFolder = (path: string): string =>
  `--${path.replace(/[/-]/g, "-")}--`;

/**
 * Write the store and point the panel at it.
 *
 * The age is stamped as a file's own mtime, which is the only figure the panel
 * reads for it, and every file of one project carries the same stamp so the
 * count and the age of a row cannot disagree.
 */
export function stageProjectStore(): string {
  const root = join(tmpdir(), "mu-projects-scene", "sessions");
  rmSync(join(tmpdir(), "mu-projects-scene"), { recursive: true, force: true });

  const now = Date.now();
  for (const project of SCENE_PROJECTS) {
    const dir = join(root, encodeFolder(project.path));
    mkdirSync(dir, { recursive: true });
    const touched = new Date(now - project.ageMin * 60_000);
    for (let at = 0; at < project.sessions; at += 1) {
      const file = join(dir, `${String(at).padStart(3, "0")}.jsonl`);
      writeFileSync(file, `${JSON.stringify({ cwd: project.path })}\n`);
      utimesSync(file, touched, touched);
    }
  }

  process.env[PROJECTS_STORE_ENV] = root;
  return root;
}
