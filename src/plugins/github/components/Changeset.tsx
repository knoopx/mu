/**
 * A changeset: the files one pull request or one commit moved.
 *
 * This is the widget the app already uses for its own changes — adwaita's
 * `FileChangeRow`, which is a file icon, the path, what happened to it, its two
 * counts set against the widest count in the change, and a little histogram of the
 * same two numbers. A pull request and a commit are changesets, so they wear it;
 * they do not wear a list of strings that happens to contain paths.
 */

import type { JSX } from "react";
import {
  Column,
  DiffHistogram,
  DiffStats,
  FileChangeRow,
  Row,
  fileRowStats,
  useAdwaita,
  type FileRowData,
} from "adwaita-gpuix";

import { figureGap } from "../../core/lib/ui/tokens";
import type { GithubRow } from "../types";

/** A `+22 −6`, back into the two numbers the widget draws with. */
export function changeCountsOf(figure: string): {
  insertions: number;
  deletions: number;
} {
  const digits = figure.match(/\d+/g) ?? [];
  return {
    insertions: Number(digits[0] ?? 0),
    deletions: Number(digits[1] ?? 0),
  };
}

/** The whole change at one glance: the counts and their ratio, one bar. */
export function ChangeScale({
  insertions,
  deletions,
}: {
  insertions: number;
  deletions: number;
}): JSX.Element | null {
  const t = useAdwaita();
  if (insertions + deletions === 0) return null;

  const stats = fileRowStats([{ status: "", path: "", insertions, deletions }]);

  return (
    <Row gap={figureGap(t)} align="center">
      <DiffStats insertions={insertions} deletions={deletions} stats={stats} />
      <DiffHistogram insertions={insertions} deletions={deletions} />
    </Row>
  );
}

/** Every file the change touched, in the kit's own change rows. */
export function Changeset({ rows }: { rows: GithubRow[] }): JSX.Element | null {
  const files: FileRowData[] = rows.map((row) => ({
    status: row.state,
    path: row.name,
    ...changeCountsOf(row.figure),
  }));
  if (files.length === 0) return null;

  const stats = fileRowStats(files);

  return (
    <Column gap={0} style={{ minWidth: 0 }}>
      {files.map((file, index) => (
        <FileChangeRow
          key={`${file.path}-${String(index)}`}
          file={file}
          stats={stats}
          focused={false}
          height={24}
        />
      ))}
    </Column>
  );
}
