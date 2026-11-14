/**
 * One change split into two: the files (or hunks) named by the call become the
 * selected change and the rest stays the remaining change. The view paints the
 * ids of both, never the repo state itself, and the two roles are told apart
 * by their badges — which is the one thing a vcs split decides about painting.
 */

import type { JSX } from "react";
import { useAdwaita, type IconName } from "adwaita-gpuix";

import {
  ToolRowList,
  ToolStateNote,
  ToolStatusNote,
} from "../../core/components/ToolDataRows";
import { toolCellOf, type ToolRowTone } from "../../core/lib/ui/toolRowPaint";
import { toolGapColumn } from "../../core/lib/ui/toolRows";
import { VCS_BADGE_VARIANTS } from "../constants";
import type { VcsToolView } from "../types";

/** A split that selected nothing is a warning, not a failure: the call answered. */
const SPLIT_STATUS_TONES: Readonly<Record<string, ToolRowTone>> = {
  "empty-selected": "warn",
};

const SPLIT_STATUS_ICONS: Readonly<Record<string, IconName>> = {
  "empty-selected": "warning",
};

/** The folded split view: the two roles, where the remainder was placed, the note. */
export interface VcsSplitRowsProps {
  view: VcsToolView;
}

/**
 * The split views (`vcs-file-split`, `vcs-hunk-split`): one row per role —
 * `selected` and `remaining` — each with its change id, its commit hash and its
 * badge, the placement line when `insert_after` moved the remainder, and the note
 * on a failure.
 *
 * There is no summary line here. The header already says `split into 2 changes`,
 * and that sentence exists only for a run that succeeded, so a copy of it under the
 * rows was the same words twice on one row with nothing between them.
 */
export function VcsSplitRows({ view }: VcsSplitRowsProps): JSX.Element {
  const t = useAdwaita();
  const placement = toolCellOf(view.cells, "insert_after");

  return (
    <div style={toolGapColumn(t)}>
      <ToolRowList rows={view.rows} variants={VCS_BADGE_VARIANTS} />
      {placement === "" ? null : (
        <ToolStateNote
          icon="subdirectoryArrowRight"
          tone="accent"
          text={`remaining placed after ${placement}`}
        />
      )}
      <ToolStatusNote
        status={view.status}
        note={view.note}
        tones={SPLIT_STATUS_TONES}
        icons={SPLIT_STATUS_ICONS}
      />
    </div>
  );
}
