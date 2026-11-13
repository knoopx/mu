/**
 * What a project has published, drawn as the track of dates it is.
 *
 * A release list is a history: newest at the top, each entry tagged and dated. The
 * kit's timeline says that shape without a header row — `at`, `what`, and the tag
 * underneath it — and the newest one stands as the current point rather than as
 * row one of a table.
 */

import type { JSX } from "react";
import { Timeline, type TimelineItem } from "adwaita-gpuix";

import { humanDate } from "../lib/format";
import type { GithubRow } from "../types";

export function ReleaseTrack({
  rows,
}: {
  rows: GithubRow[];
}): JSX.Element | null {
  if (rows.length === 0) return null;

  const items: TimelineItem[] = rows.map((row, index) => ({
    at: humanDate(row.figure === "" ? row.detail : row.figure),
    title: row.name === "" ? row.detail : row.name,
    ...(row.detail === "" || row.name === row.detail
      ? {}
      : {
          note: row.state === "" ? row.detail : `${row.detail} · ${row.state}`,
        }),
    status: index === 0 ? "current" : "done",
  }));

  return <Timeline items={items} style={{ width: "100%", minWidth: 0 }} />;
}
