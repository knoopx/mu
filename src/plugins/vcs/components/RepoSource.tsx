/**
 * Where the repository panels get their reading of the repository.
 *
 * The live answer shells out to jj: a change stack, its files, a patch, the
 * operation log, and a poll on the op-log head so the panel notices a commit
 * nobody asked it about. That is what the app must do. A story is a picture of a
 * panel, and a panel that shells out paints whatever the working copy happens to
 * hold at the second the PNG is written, and pays a subprocess for every read of
 * one frame — so a story hands in the rows instead. This is the same seam
 * `ProjectSource` already is for the project card and the file previews.
 *
 * Writes stay live and stay unmocked: no story writes to a repository.
 */
import { createContext, useContext, type ReactNode } from "react";
import {
  jjOpHeadPath,
  type Bookmark,
  type Change,
  type FileChange,
} from "adwaita-gpuix";
import {
  findWorkspaceRoot,
  getCurrentChangeId,
  getRawDiff,
  listBookmarks,
  loadChanges,
  loadChangedFiles,
  loadFileBytes,
} from "../lib/repo";
import {
  runOplog,
  runOpPatch,
  type OplogOutcome,
  type OpPatchOutcome,
} from "../lib/ops";

export interface RepoSource {
  /** The workspace the panels stand in, or null outside a repository. */
  workspaceRoot(cwd: string): string | null;

  /**
   * The file the panel polls to notice the repository moving. Null means do not
   * watch: a story paints one frozen moment.
   */
  opHeadPath(cwd: string): string | null;

  changes(revset: string): Promise<Change[]>;

  bookmarks(): Promise<Bookmark[]>;

  currentChangeId(): Promise<string | null>;

  changedFiles(changeId: string): Promise<FileChange[]>;

  diff(changeId: string, filePath?: string): Promise<string>;

  fileBytes(
    changeId: string,
    filePath: string,
    at: "change" | "parent",
  ): Promise<Uint8Array | null>;

  oplog(
    limit: number,
    offset: number,
    oldestFirst: boolean,
    full: boolean,
  ): Promise<OplogOutcome>;

  opPatch(op: string): Promise<OpPatchOutcome>;
}

export const LIVE_REPO: RepoSource = {
  workspaceRoot: (cwd) => {
    try {
      return findWorkspaceRoot(cwd);
    } catch {
      return null;
    }
  },
  opHeadPath: (cwd) => {
    try {
      return jjOpHeadPath(findWorkspaceRoot(cwd));
    } catch {
      return null;
    }
  },
  changes: (revset) => loadChanges(revset),
  bookmarks: () => listBookmarks(),
  currentChangeId: () => getCurrentChangeId(),
  changedFiles: (changeId) => loadChangedFiles(changeId),
  diff: (changeId, filePath) => getRawDiff(changeId, filePath),
  fileBytes: (changeId, filePath, at) => loadFileBytes(changeId, filePath, at),
  oplog: (limit, offset, oldestFirst, full) =>
    runOplog(limit, offset, oldestFirst, full),
  opPatch: (op) => runOpPatch(op),
};

const RepoSourceContext = createContext<RepoSource>(LIVE_REPO);

export function RepoSourceProvider(props: {
  source: RepoSource;
  children: ReactNode;
}) {
  return (
    <RepoSourceContext.Provider value={props.source}>
      {props.children}
    </RepoSourceContext.Provider>
  );
}

export const useRepoSource = (): RepoSource => useContext(RepoSourceContext);
