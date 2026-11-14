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
  FileChangeRow,
  fileRowStats,
  type FileRowData,
} from "adwaita-gpuix";
import { Band, Prose } from "./chrome";
import type { GithubToolView } from "../lib/toolView";
import type { GithubRow } from "../types";

/** A `+22 −6`, back into the two numbers the widget draws with. */
function changeCountsOf(figure: string): {
  insertions: number;
  deletions: number;
} {
  const digits = figure.match(/\d+/g) ?? [];
  return {
    insertions: Number(digits[0] ?? 0),
    deletions: Number(digits[1] ?? 0),
  };
}
/** Every file the change touched, in the kit's own change rows. */
function Changeset({ rows }: { rows: GithubRow[] }): JSX.Element | null {
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

/**
 * A record and the files it moved, in the order its reader asks for them: the
 * record's own name, the change itself, then its prose. Everything that identifies the
 * change — sha or number, repository, who wrote it, when it landed, how many files and
 * commits it counts — is the header's line and its chips.
 *
 * A commit and a pull request are one shape — a thing, a changeset under it, a
 * message under that — so the order is settled once. What the card is called and
 * which counts it is worth are still each kind's own, so `github-commit` and
 * `github-pr` say different things above the same change.
 */
export function ChangesetCard({ view }: { view: GithubToolView }): JSX.Element {
  return (
    <>
      <Band first>
        <Changeset rows={view.rows} />
      </Band>
      <Band>
        <Prose source={view.body} />
      </Band>
    </>
  );
}
