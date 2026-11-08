import { useCallback, useState } from "react";
import { deleteFile, type FileDeleteResult } from "../lib/files/deleteFile";
import { invalidateFileList } from "../lib/files/fileList";

export interface FileListState {
  /** Take a listed file off the disk; the answer says why it could not. */
  remove(path: string): FileDeleteResult;

  /** Drop the folder's walk, so the next read lists the tree as it now is. */
  reload(): void;
}

/**
 * The file panel's list, and the delete that takes a row out of it.
 *
 * The walk of the project is cached per folder so narrowing the panel never
 * relists it, which makes a delete the one thing that has to drop that cache:
 * the file it unlinked would otherwise stay in the list as a row that previews
 * nothing. The repaint is the same one any panel row leaves behind — the panel
 * reads its rows again as part of the render, so a deleted row is gone from the
 * list and the cursor is left on its neighbour, whose preview is read fresh.
 */
export function useFileList(cwd: string): FileListState {
  const [, repaint] = useState(0);

  const reload = useCallback((): void => {
    invalidateFileList(cwd);
    repaint((n) => n + 1);
  }, [cwd]);

  const remove = useCallback(
    (path: string): FileDeleteResult => {
      const result = deleteFile(cwd, path);
      if (result.ok) reload();
      return result;
    },
    [cwd, reload],
  );

  return { remove, reload };
}
