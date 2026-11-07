/**
 * One change split into two: the files (or hunks) named by the call become the
 * selected change and the rest stays the remaining change. The view paints the
 * ids of both, never the repo state itself.
 */

import type { JSX } from "react";
import { useAdwaita } from "adwaita-gpuix";

import { toolGapColumn } from "../../core/lib/ui/toolRows";
import type { VcsToolView } from "../types";
import {
  VcsChips,
  VcsDataRow,
  VcsStateLine,
  VcsSummary,
  vcsCellOf,
  type VcsTone,
} from "./VcsRows";

function toneOf(status: VcsToolView["status"]): VcsTone {
  if (status === "failed" || status === "unsupported") return "bad";
  if (status === "empty-selected") return "warn";
  return "neutral";
}

/** The folded split view: pre-state chips, the two roles, placement, note. */
export interface VcsSplitRowsProps {
  view: VcsToolView;
}

/**
 * The split views (`vcs-file-split`, `vcs-hunk-split`): the pre-state the
 * call started from, then one row per role — `selected` and `remaining` —
 * each with its change id, its commit hash and its badge, the placement
 * line when `insert_after` moved the remainder, and the note on a failure.
 */
export function VcsSplitRows({ view }: VcsSplitRowsProps): JSX.Element {
  const t = useAdwaita();
  const tone = toneOf(view.status);
  const placement = vcsCellOf(view, "insert_after");

  return (
    <div style={toolGapColumn(t)}>
      <VcsChips cells={view.cells} />
      <VcsSummary text={view.headline} tone={tone} />
      {view.rows.map((row, index) => (
        <VcsDataRow key={row.key} row={row} first={index === 0} />
      ))}
      {placement === "" ? null : (
        <VcsStateLine
          icon="subdirectoryArrowRight"
          tone="accent"
          text={`remaining placed after ${placement}`}
        />
      )}
      {view.note === "" ? null : (
        <VcsStateLine
          icon={view.status === "failed" ? "close" : "warning"}
          tone={tone}
          text={view.note}
        />
      )}
    </div>
  );
}
