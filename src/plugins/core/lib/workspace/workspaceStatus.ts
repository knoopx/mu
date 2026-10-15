import { spawnSync } from "node:child_process";

export const NO_BOOKMARK = "no bookmark";

export interface WorkspaceStatus {
  projectPath: string;

  bookmark: string;
}

export function shortenPath(
  path: string,
  home: string = process.env.HOME ?? "/home",
): string {
  if (!path) return path;
  if (home && (path === home || path.startsWith(`${home}/`)))
    return `~${path.slice(home.length)}`;
  if (path.startsWith("/home/")) return `~${path.slice("/home".length)}`;
  return path;
}

interface BookmarkRow {
  name: string;
  present: boolean;
}

const BOOKMARK_TEMPLATE = 'name ++ "\\t" ++ present ++ "\\n"';

function jjBookmarks(cwd: string, extraArgs: string[]): BookmarkRow[] | null {
  const result = spawnSync(
    "jj",
    ["bookmark", "list", ...extraArgs, "-T", BOOKMARK_TEMPLATE],
    {
      cwd,
      encoding: "utf8",
      timeout: 3000,
    },
  );
  if (result.error || result.status !== 0) return null;
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [name, present] = line.split("\t");
      return {
        name: (name ?? "").trim(),
        present: (present ?? "true").trim() !== "false",
      };
    })
    .filter((row) => row.name.length > 0);
}

function pick(rows: BookmarkRow[] | null): string | null {
  if (!rows || rows.length === 0) return null;
  return (rows.find((row) => row.present) ?? rows[0]).name;
}

export function currentBookmark(cwd: string = process.cwd()): string {
  const atHead = jjBookmarks(cwd, ["-r", "@"]);
  const active = pick(atHead);
  if (active) return active;
  return pick(jjBookmarks(cwd, [])) ?? NO_BOOKMARK;
}

export function readWorkspaceStatus(
  cwd: string = process.cwd(),
): WorkspaceStatus {
  let bookmark = NO_BOOKMARK;
  try {
    bookmark = currentBookmark(cwd);
  } catch {
    bookmark = NO_BOOKMARK;
  }
  return { projectPath: shortenPath(cwd), bookmark };
}
