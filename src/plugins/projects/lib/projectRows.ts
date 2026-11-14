/**
 * The projects panel's rows.
 *
 * A row is a working directory, and it says the four things that pick it out of a
 * list of them: the folder's own name, the folder it sits in, how many sessions
 * are waiting there, and how long ago mu last worked there. Each of those is a
 * column of the list, so the names line up, the paths line up, and the two
 * figures line up right-aligned against each other — a list of projects reads
 * down its columns rather than across each row separately.
 *
 * The path is the folder the project sits in, not the whole path again: the row
 * has already printed the last segment as its name, and a second copy of it is a
 * line spent saying nothing. The whole path is still what the filter matches, and
 * the status line says how many projects the store holds against how many the
 * query left.
 */

import { dirname, resolve } from "node:path";
import type { IconName } from "adwaita-gpuix";
import {
  cappedPanelStatusText,
  matchesQuery,
} from "../../core/lib/composer/options";
import type { ComposerPanelRow } from "../../core/components/composer/Composer";
import { displayPath } from "../../core/lib/utils/paths";
import { relativeAge } from "../../core/lib/utils/time";
import { PROJECT_ROWS_CAP } from "../constants";
import type { ProjectFolder } from "../types";

/**
 * The two figures a project row trails, in the marks the rest of the app already
 * uses for them: `chat` for the conversations waiting in that folder, `history`
 * for when the folder was last one of them. A bare number beside a path is a
 * figure the reader has to guess at, and a clock on the count is a guess that is
 * wrong — the age, which is the real time, stands beside it.
 */
const PROJECT_FIGURES: readonly {
  icon: IconName;
  pick: (project: ProjectFolder) => string;
}[] = [
  { icon: "chat", pick: (project) => String(project.sessions) },
  {
    icon: "history",
    pick: (project) => relativeAge(new Date(project.lastUsedMs)),
  },
];

export function filterProjects(
  projects: readonly ProjectFolder[],
  query: string,
): ProjectFolder[] {
  return projects.filter((project) =>
    matchesQuery(query, project.name, displayPath(project.path)),
  );
}

/** Whether this window is already in that folder — the row is then "here". */
export const isCurrentProject = (path: string, cwd: string): boolean =>
  resolve(path) === resolve(cwd);

/** The folder a project sits in, in the spelling the app prints paths in. */
export const projectPlace = (path: string): string =>
  displayPath(dirname(path));

export function projectRows(
  projects: readonly ProjectFolder[],
  query: string,
  cwd: string,
): ComposerPanelRow[] {
  return filterProjects(projects, query)
    .slice(0, PROJECT_ROWS_CAP)
    .map((project) => ({
      kind: "option" as const,
      key: project.path,
      label: project.name,
      place: projectPlace(project.path),
      figures: PROJECT_FIGURES.map((figure) => ({
        icon: figure.icon,
        text: figure.pick(project),
      })),
      picked: isCurrentProject(project.path, cwd),
    }));
}

export function projectStatusText(
  total: number,
  query: string,
  visible: number,
): string {
  return cappedPanelStatusText(
    "projects",
    total,
    visible,
    query,
    PROJECT_ROWS_CAP,
    "on this machine",
  );
}

export function projectsEmptyText(query: string): string {
  return query.trim().length === 0
    ? "No project has a session yet"
    : "No project matches";
}
