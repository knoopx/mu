/**
 * A folder, drawn as the folder it was listed as.
 *
 * GitHub's contents endpoint answers one level of a path, and this draws exactly
 * that: every entry with the mark of what it is, at the same depth, because that
 * is where GitHub says they all stand. A folder here arrives with no contents of
 * its own — a later read of that path is what brings them — so it must not wear
 * an open mark: a chevron pointing down over the rows under it is read as those
 * rows standing inside it, and a file that looks nested is a path the reader will
 * ask for wrong. Folders are grouped above the files for the same reason: the
 * endpoint sorts by name across both, and a listing that alternates folder, file,
 * folder reads as three nested folders. Sizes stay in the model's table — a
 * listing answers “what is here, and which of it is a folder”, and a count above
 * the list would be the list counted twice.
 */

import type { JSX } from "react";
import { FileTree, type FileTreeNode } from "adwaita-gpuix/ai";

import type { GithubRow } from "../types";

const isFolder = (type: string): boolean =>
  type === "dir" || type === "folder" || type === "tree";

export function FolderTree({ rows }: { rows: GithubRow[] }): JSX.Element {
  const entryOf = (row: GithubRow): FileTreeNode => ({
    name: row.name,
    type: isFolder(row.state) ? "folder" : "file",
  });
  // GitHub's own order alternates the two types by name; each group keeps that
  // order, so a folder is still where the alphabet puts it among its own kind.
  const items: FileTreeNode[] = [
    ...rows.filter((row) => isFolder(row.state)).map(entryOf),
    ...rows.filter((row) => !isFolder(row.state)).map(entryOf),
  ];

  return (
    <FileTree
      items={items}
      variant="list"
      style={{ width: "100%", minWidth: 0 }}
    />
  );
}
