/**
 * One change split into two: the files (or hunks) named by the call become the
 * selected change and the rest stays the remaining change. The view paints the
 * ids of both, never the repo state itself, and the two roles are told apart
 * by their badges — which is the one thing a vcs split decides about painting.
 */

import type { JSX } from "react";
import { useAdwaita, type IconName } from "adwaita-gpuix";

import {
  ToolChips,
  ToolRowList,
  ToolStateNote,
  ToolStatusNote,
  ToolSummary,
} from "../../core/components/ToolDataRows";
import {
  toolCellOf,
  toolStatusTone,
  type ToolRowTone,
} from "../../core/lib/ui/toolRowPaint";
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

const toneOf = (status: VcsToolView["status"]): ToolRowTone =>
  toolStatusTone(status, SPLIT_STATUS_TONES);

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
  const placement = toolCellOf(view.cells, "insert_after");

  return (
    <div style={toolGapColumn(t)}>
      <ToolChips cells={view.cells} />
      <ToolSummary text={view.headline} tone={tone} />
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
