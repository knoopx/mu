/**
 * Hand one file row to a program, and say what answered.
 *
 * Both repo panels' file halves open the file under the cursor — `o` to the
 * desktop's default handler for its type, `e` to the user's editor — and both
 * read the path the same way: the panel lists files relative to the workspace
 * root, so that is the folder the guard and the program are given. One writer
 * keeps the two panels' notices in one wording, naming the program the file
 * went to so a reader can tell the two keys apart after the fact.
 */
import { type ToastFn } from "adwaita-gpuix";
import {
  openFileInDefaultApp,
  openFileInEditor,
  openNotice,
  type FileOpenResult,
  type OpenTarget,
} from "../../core/lib/files/openFile";
import { findWorkspaceRoot } from "./repo";

type FileOpener = (cwd: string, path: string) => Promise<FileOpenResult>;

const OPENERS: Record<OpenTarget, FileOpener> = {
  "default app": openFileInDefaultApp,
  editor: openFileInEditor,
};

export function openPanelFile(
  path: string,
  target: OpenTarget,
  toast: ToastFn,
): void {
  void OPENERS[target](findWorkspaceRoot(), path).then((result) => {
    const notice = openNotice(result, path, target);
    toast(notice.message, { type: notice.type });
  });
}
