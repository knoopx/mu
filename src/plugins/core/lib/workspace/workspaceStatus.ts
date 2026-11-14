import { currentBookmark } from "../../../vcs/lib/repo";

export interface WorkspaceStatus {
  projectPath: string;

  /**
   * The bookmark the working copy stands on, or null when it stands on none.
   *
   * Null rather than a word for the absence: what a header says when there is no
   * bookmark is the window's business, and a placeholder string that three files
   * had to compare against was the window asking the repo a question in prose.
   */
  bookmark: string | null;
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

/**
 * What the project header says about the folder it stands in.
 *
 * The path is core's; the bookmark is read through the plugin that owns the
 * change-tracking CLI, which is the only place that knows how to ask for one.
 */
export function readWorkspaceStatus(
  cwd: string = process.cwd(),
): WorkspaceStatus {
  return { projectPath: shortenPath(cwd), bookmark: currentBookmark(cwd) };
}
