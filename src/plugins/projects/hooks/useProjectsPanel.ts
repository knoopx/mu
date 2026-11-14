import { useCachedResource } from "../../core/hooks/useCachedResource";
import { scanProjectFolders } from "../lib/projectStore";
import type { ProjectFolder, ProjectsPanelApi } from "../types";

/**
 * The list is the session store, not this window's folder, so it is read once per
 * window and kept: opening the panel a second time shows what it showed a minute
 * ago and re-reads underneath, rather than blanking the list while the walk runs.
 */
const folderCache = new Map<string, ProjectFolder[]>();

const STORE_KEY = "sessions";

const NO_FOLDERS: ProjectFolder[] = [];

export function useProjectsPanel(active: boolean): ProjectsPanelApi {
  const { data, loading, error } = useCachedResource<ProjectFolder[]>({
    cache: folderCache,
    key: STORE_KEY,
    active,
    fallback: NO_FOLDERS,
    load: async () => scanProjectFolders(),
  });

  return { projects: data, loading, error };
}
