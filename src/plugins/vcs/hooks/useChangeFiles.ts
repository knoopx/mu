/**
 * The files of one change, and the patch of one of them.
 *
 * A change's file list and the patch under it are read from jj whenever the
 * selection moves, and a refresh of the stack re-reads them while trying to
 * keep the reader on the same file. Neither is the stack's own business, so
 * they are held here.
 */
import { useCallback, useRef, useState } from "react";
import { getRawDiff, loadChangedFiles } from "../lib/repo";
import { type Change, type FileChange } from "adwaita-gpuix";

export interface ChangeFiles {
  files: FileChange[];
  fileSel: number;
  patch: string;

  /** read the files of `change`, keeping `fileIndex` or the file being read */
  show(change: Change | undefined, fileIndex?: number): Promise<void>;

  /** read one file's patch, leaving the file list as it is */
  select(change: Change | undefined, index: number): void;

  setFileSel(index: number): void;
}

export function useChangeFiles(): ChangeFiles {
  const [files, setFiles] = useState<FileChange[]>([]);
  const [fileSel, setFileSel] = useState(0);
  const [patch, setPatch] = useState("");

  const readRef = useRef({ files, fileSel });
  readRef.current = { files, fileSel };

  const show = useCallback(
    async (change: Change | undefined, fileIndex?: number): Promise<void> => {
      if (change === undefined) {
        setFiles([]);
        setFileSel(0);
        setPatch("");
        return;
      }
      const fs = await loadChangedFiles(change.change_id);
      setFiles(fs);
      const wanted =
        fileIndex ??
        Math.max(0, Math.min(readRef.current.fileSel, fs.length - 1));
      setFileSel(wanted);
      setPatch(await getRawDiff(change.change_id, fs[wanted]?.path));
    },
    [],
  );

  const select = useCallback(
    (change: Change | undefined, index: number): void => {
      setFileSel(index);
      if (change === undefined) return;
      void getRawDiff(
        change.change_id,
        readRef.current.files[index]?.path,
      ).then(setPatch);
    },
    [],
  );

  return {
    files,
    fileSel,
    patch,
    show,
    select,
    setFileSel,
  };
}
