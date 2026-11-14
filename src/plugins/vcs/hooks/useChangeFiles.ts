/**
 * The files of one change, and the preview of one of them.
 *
 * A change's file list and the preview under it are read from jj whenever the
 * selection moves, and a refresh of the stack re-reads them while trying to
 * keep the reader on the same file. Neither is the stack's own business, so
 * they are held here. A text file is previewed as its patch; a picture is
 * previewed as its bytes at the change and at the change's parent, because no
 * patch describes a picture.
 */
import { useCallback, useRef, useState } from "react";
import { getRawDiff, loadChangedFiles, loadFileBytes } from "../lib/repo";
import { imageDataUrl, isImageFile } from "../lib/preview";
import { type Change, type FileChange } from "adwaita-gpuix";

/**
 * The two pictures of an image change, as srcs; "" where there is no side.
 *
 * A read is two jj calls, so it says which file it is for and whether it has
 * finished: the panel only ever paints the picture of the file it is on.
 */
export interface ChangeImage {
  path: string;

  before: string;

  after: string;

  beforeBytes: number;

  afterBytes: number;

  loading: boolean;
}

export interface ChangeFiles {
  files: FileChange[];
  fileSel: number;
  patch: string;
  image: ChangeImage | null;

  /** read the files of `change`, keeping `fileIndex` or the file being read */
  show(change: Change | undefined, fileIndex?: number): Promise<void>;

  /** read one file's preview, leaving the file list as it is */
  select(change: Change | undefined, index: number): void;

  setFileSel(index: number): void;
}

export function useChangeFiles(): ChangeFiles {
  const [files, setFiles] = useState<FileChange[]>([]);
  const [fileSel, setFileSel] = useState(0);
  const [patch, setPatch] = useState("");
  const [image, setImage] = useState<ChangeImage | null>(null);

  const readRef = useRef({ files, fileSel });
  readRef.current = { files, fileSel };

  /** A slow read must not land after a newer selection has. */
  const seqRef = useRef(0);

  const readImage = useCallback(
    async (changeId: string, path: string, seq: number): Promise<void> => {
      setImage({
        path,
        before: "",
        after: "",
        beforeBytes: 0,
        afterBytes: 0,
        loading: true,
      });
      const [before, after] = await Promise.all([
        loadFileBytes(changeId, path, "parent"),
        loadFileBytes(changeId, path, "change"),
      ]);
      if (seq !== seqRef.current) return;
      setImage({
        path,
        before: before === null ? "" : imageDataUrl(before, path),
        after: after === null ? "" : imageDataUrl(after, path),
        beforeBytes: before?.length ?? 0,
        afterBytes: after?.length ?? 0,
        loading: false,
      });
    },
    [],
  );

  const read = useCallback(
    async (
      change: Change,
      path: string | undefined,
      seq: number,
    ): Promise<void> => {
      const isPicture = path !== undefined && isImageFile(path);
      const next =
        path === undefined ? "" : await getRawDiff(change.change_id, path);
      if (seq !== seqRef.current) return;
      setPatch(next);
      if (!isPicture || path === undefined) {
        setImage(null);
        return;
      }
      await readImage(change.change_id, path, seq);
    },
    [readImage],
  );

  const show = useCallback(
    async (change: Change | undefined, fileIndex?: number): Promise<void> => {
      const seq = ++seqRef.current;
      if (change === undefined) {
        setFiles([]);
        setFileSel(0);
        setPatch("");
        setImage(null);
        return;
      }
      const fs = await loadChangedFiles(change.change_id);
      if (seq !== seqRef.current) return;
      setFiles(fs);
      const wanted =
        fileIndex ??
        Math.max(0, Math.min(readRef.current.fileSel, fs.length - 1));
      setFileSel(wanted);
      await read(change, fs[wanted]?.path, seq);
    },
    [read],
  );

  const select = useCallback(
    (change: Change | undefined, index: number): void => {
      const seq = ++seqRef.current;
      setFileSel(index);
      if (change === undefined) return;
      void read(change, readRef.current.files[index]?.path, seq);
    },
    [read],
  );

  return {
    files,
    fileSel,
    patch,
    image,
    show,
    select,
    setFileSel,
  };
}
