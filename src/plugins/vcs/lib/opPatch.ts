/**
 * The files one operation touched, and the patch of one of them.
 *
 * A change's files are read one call per file because jj is asked per change. An
 * operation is different: it *is* a diff of the whole repo, and one
 * `jj operation diff --op <id> --git` hands the whole patch over, so the file
 * list and each file's own block are cut out of that text here. One pass, and
 * the row's counts and the preview under it come from the same block.
 */
import { filePatchStats, type FileChange } from "adwaita-gpuix";

/** One file of an operation: what adwaita's file row wants, plus its own patch. */
export interface OpPatchFile extends FileChange {
  patch: string;
}

const DIFF_HEAD = "diff --git ";

/** The `b/…` path of a `diff --git a/old b/new` header, as adwaita's own list reads it. */
function pathOfHeader(line: string): string {
  const token = line.split(" ")[3] ?? "";
  return token.startsWith("a/") || token.startsWith("b/") ? token.slice(2) : token;
}

/**
 * Every `diff --git` block of the patch, in path order.
 *
 * Path order is what a change's file list is sorted by too, so the two panels
 * list the same repo the same way.
 */
export function opPatchFiles(patch: string): OpPatchFile[] {
  const lines = patch.split("\n");
  const files: OpPatchFile[] = [];

  const close = (start: number, end: number, path: string): void => {
    const block = lines.slice(start, end).join("\n");
    files.push({ path, ...filePatchStats(block), patch: block });
  };

  let start = -1;
  let path = "";
  for (let i = 0; i < lines.length; i++) {
    if (!(lines[i] ?? "").startsWith(DIFF_HEAD)) continue;
    if (start >= 0) close(start, i, path);
    start = i;
    path = pathOfHeader(lines[i] ?? "");
  }
  if (start >= 0) close(start, lines.length, path);

  return files.sort((a, b) => a.path.localeCompare(b.path));
}
