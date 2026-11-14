import { basename, dirname, relative } from "node:path";

import {
  bookmarksByChange,
  buildActivityModel,
  detectAgentsFile,
  detectLanguage,
  detectLicense,
  isProjectRoot,
  readScripts,
  weeklyBuckets,
  type ActivityModel,
} from "adwaita-gpuix";

import {
  findWorkspaceRoot,
  listBookmarks,
  loadChanges,
  trackedFileCount,
} from "../../../vcs/lib/repo";
import { type Change } from "adwaita-gpuix";
import { shortenPath } from "../workspace/workspaceStatus";

export const SPARKLINE_WEEKS = 12;

/** How many recent changes the project summary feed shows. */
export const FEED_COUNT = 25;

const SUMMARY_REVSET = "::";

export interface ProjectMeta {
  language: string | null;
  license: string | null;
  agentsFile: string | null;
  scripts: string[];
  trackedFiles: number | null;
}

export interface ProjectIdentity {
  name: string;
  root: string;
  cwd: string;

  shortPath: string;

  group: string;
  isRepo: boolean;
  /** the bookmark the working copy stands on; null when it stands on none */
  bookmark: string | null;
}

/** A recent change together with the bookmarks that point at it. */
export interface FeedChange {
  change: Change;
  bookmarks: string[];
}

/**
 * The shared activity model with its feed decorated for mu: `recent` carries
 * bookmark names, which only mu's own bookmark map knows about.
 */
export type ProjectActivity = Omit<ActivityModel<Change>, "recent"> & {
  recent: FeedChange[];
};

export function projectActivity(
  model: ActivityModel<Change>,
  bookmarks: Map<string, string[]>,
): ProjectActivity {
  return {
    ...model,
    recent: model.recent.map((change) => ({
      change,
      bookmarks: bookmarks.get(change.change_id) ?? [],
    })),
  };
}

export interface ProjectSummaryModel {
  identity: ProjectIdentity;
  meta: ProjectMeta;
  activity: ProjectActivity;

  weekly: number[];
}

function readProjectMeta(repoPath: string): ProjectMeta {
  return {
    language: detectLanguage(repoPath),
    license: detectLicense(repoPath),
    agentsFile: detectAgentsFile(repoPath),
    scripts: readScripts(repoPath),
    trackedFiles: null,
  };
}
export interface LoadSummaryOptions {
  cwd?: string;
  bookmark?: string | null;
  now?: Date;
}

export async function loadProjectSummary(
  options: LoadSummaryOptions = {},
): Promise<ProjectSummaryModel> {
  const cwd = options.cwd ?? process.cwd();
  const now = options.now ?? new Date();
  const root = findWorkspaceRoot(cwd);
  const isRepo = isProjectRoot(root);
  const meta = readProjectMeta(root);
  const identity: ProjectIdentity = {
    name: basename(root),
    root,
    cwd,
    shortPath: shortenPath(root),
    group: relative(dirname(root), root) || basename(root),
    isRepo,
    bookmark: options.bookmark ?? null,
  };

  if (!isRepo) {
    return {
      identity,
      meta,
      activity: projectActivity(
        buildActivityModel([], { now, feedCount: 0 }),
        new Map(),
      ),
      weekly: [],
    };
  }

  const [changes, bookmarks, trackedFiles] = await Promise.all([
    loadChanges(SUMMARY_REVSET),
    listBookmarks(),
    trackedFileCount(root),
  ]);

  const byChange = bookmarksByChange(bookmarks);
  return {
    identity,
    meta: {
      ...meta,
      trackedFiles,
    },
    activity: projectActivity(
      buildActivityModel(changes, { now, feedCount: FEED_COUNT }),
      byChange,
    ),
    weekly: weeklyBuckets(changes, SPARKLINE_WEEKS, now.getTime()),
  };
}
