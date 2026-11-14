/**
 * The projects mu knows about, read off its own session store.
 *
 * pi files every session under `<agent dir>/sessions/<folder for the cwd>/`, one
 * `.jsonl` per session, so the parent dir of a session file is a working
 * directory somebody has already worked in. That is the list this panel needs:
 * not every folder on disk, but the ones with history behind them, ranked by how
 * recently one of them was written to — which is exactly the order a person
 * reaches for them in.
 *
 * The folder name is only a safe spelling of a path (`/` and `-` both become
 * `-`), so it cannot be read back on its own. pi writes the real `cwd` in the
 * first line of every session file, so one bounded read of the newest file in a
 * folder answers the path; the decoded folder name is the fallback for a file
 * whose header cannot be read. A folder whose path no longer exists is dropped —
 * a project that was deleted is not a choice to offer.
 */

import {
  closeSync,
  existsSync,
  openSync,
  readdirSync,
  readSync,
  statSync,
  type Dirent,
} from "node:fs";
import { basename, join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import {
  PROJECTS_STORE_ENV,
  SESSION_FILE_SUFFIX,
  SESSION_HEADER_BYTES,
  SESSIONS_DIR_NAME,
} from "../constants";
import type { ProjectFolder } from "../types";

/**
 * Where pi files sessions: the folders inside it are the projects.
 *
 * `MU_PROJECTS_STORE` names another store outright — the scene's own still one,
 * or a second agent dir's — and nothing outside this plugin reads it.
 */
export const sessionsRoot = (env: NodeJS.ProcessEnv = process.env): string => {
  const named = env[PROJECTS_STORE_ENV]?.trim() ?? "";
  return named === "" ? join(getAgentDir(), SESSIONS_DIR_NAME) : named;
};

/**
 * The path pi encoded a folder name from.
 *
 * `--home-me-Projects-app--` is `/home/me/Projects/app` until a folder name has a
 * dash in it, and then the spelling is ambiguous — which is why this is the
 * fallback and the session header is the answer.
 */
export function decodeSessionFolder(name: string): string | null {
  const body = name.replace(/^--/, "").replace(/--$/, "");
  if (body.length === 0) return null;
  return `/${body.replace(/-/g, "/")}`;
}

/** The `cwd` pi wrote in the first line of a session file. */
function sessionCwdOf(sessionFile: string): string | null {
  let fd: number | undefined;
  try {
    fd = openSync(sessionFile, "r");
    const buffer = Buffer.alloc(SESSION_HEADER_BYTES);
    const read = readSync(fd, buffer, 0, SESSION_HEADER_BYTES, 0);
    const first = buffer.subarray(0, read).toString("utf8").split("\n")[0];
    const header = JSON.parse(first ?? "") as { cwd?: unknown };
    return typeof header.cwd === "string" && header.cwd.trim() !== ""
      ? header.cwd
      : null;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {}
    }
  }
}

interface SessionFolderRead {
  dir: string;
  sessions: number;
  newest: string;
  lastUsedMs: number;
}

/** One session folder: how many files it holds and the newest of them. */
function readSessionFolder(dir: string): SessionFolderRead | null {
  let files: string[];
  try {
    files = readdirSync(dir).filter((file) =>
      file.endsWith(SESSION_FILE_SUFFIX),
    );
  } catch {
    return null;
  }
  if (files.length === 0) return null;
  let newest = "";
  let lastUsedMs = -1;
  for (const file of files) {
    let mtime = 0;
    try {
      mtime = statSync(join(dir, file)).mtimeMs;
    } catch {
      continue;
    }
    if (mtime > lastUsedMs) {
      lastUsedMs = mtime;
      newest = file;
    }
  }
  if (newest === "") return null;
  return { dir, sessions: files.length, newest, lastUsedMs };
}

/**
 * Every project folder inside one session store, newest worked-in first.
 *
 * `root` and `exists` are the seams: the walk is the same whether it is pi's real
 * store or a folder a test wrote, and the one question that needs the disk outside
 * the store — is that project still there to be worked in — can be answered either
 * by the filesystem or by the caller.
 */
export function projectsFromSessions(
  root: string,
  exists: (path: string) => boolean = existsSync,
): ProjectFolder[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const byPath = new Map<string, ProjectFolder>();
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const dir = join(root, entry.name);
    const folder = readSessionFolder(dir);
    if (folder === null) continue;
    const path =
      sessionCwdOf(join(dir, folder.newest)) ?? decodeSessionFolder(entry.name);
    if (path === null || !exists(path)) continue;
    const seen = byPath.get(path);
    // Two folders can spell one path (a rename that kept its history, a symlink);
    // the pair is one project with the sessions of both and the newer of the two.
    if (seen === undefined)
      byPath.set(path, {
        path,
        name: basename(path),
        sessions: folder.sessions,
        lastUsedMs: folder.lastUsedMs,
      });
    else
      byPath.set(path, {
        ...seen,
        sessions: seen.sessions + folder.sessions,
        lastUsedMs: Math.max(seen.lastUsedMs, folder.lastUsedMs),
      });
  }

  return [...byPath.values()].sort((a, b) => b.lastUsedMs - a.lastUsedMs);
}

/** What the panel reads: the projects inside the session store it is pointed at. */
export const scanProjectFolders = (
  env: NodeJS.ProcessEnv = process.env,
): ProjectFolder[] => projectsFromSessions(sessionsRoot(env));
