/**
 * A folder, drawn as a folder.
 *
 * GitHub's contents endpoint answers one level of a path, and this draws exactly
 * that: every entry with the mark of what it is, folders able to open under the
 * cursor when a later read brings their contents. Sizes stay in the model's table —
 * a listing answers “what is here, and which of it is a folder”, and a count above
 * the list would be the list counted twice.
 */

import type { JSX } from "react";
import { FileTree, type FileTreeNode } from "adwaita-gpuix/ai";

import type { GithubRow } from "../types";

const isFolder = (type: string): boolean =>
  type === "dir" || type === "folder" || type === "tree";

export function FolderTree({ rows }: { rows: GithubRow[] }): JSX.Element {
  const items: FileTreeNode[] = rows.map((row) => ({
    name: row.name,
    type: isFolder(row.state) ? "folder" : "file",
  }));

  return (
    <FileTree
      items={items}
      variant="list"
      defaultExpandedPaths={items
        .filter((item) => item.type === "folder")
        .map((item) => item.name)}
      style={{ width: "100%", minWidth: 0 }}
    />
  );
}
