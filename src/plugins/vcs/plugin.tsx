/**
 * vcs — ten tools over the change-tracking CLI, and the two panels the repo is
 * read through.
 *
 * The panel writes and the tools read go through the same library; what this file
 * registers is the surface: how a call's answer is drawn, the two wide panels and
 * the chords that open them, and the two commands that open them from the draft.
 * `changes` opens with its own event because it keeps the query it was left with.
 */

import { definePlugin, type PanelSurface } from "../core/lib/plugin/manifest";
import { ChangesOverlayHost } from "./components/ChangesOverlayHost";
import { ChangesPanel } from "./components/ChangesPanel";
import { OplogPanel } from "./components/OplogPanel";
import { changesStatus, oplogStatus } from "./lib/panelStatus";
import {
  useChangesPanel,
  type ChangesPanelState,
} from "./hooks/useChangesPanel";
import { useOplogPanel, type OplogPanelState } from "./hooks/useOplogPanel";
import { vcsConflictsTool } from "./tools/vcsConflicts";
import { vcsDescribeTool } from "./tools/vcsDescribe";
import { vcsFileDiffTool } from "./tools/vcsFileDiff";
import { vcsFileHistoryShowTool } from "./tools/vcsFileHistoryShow";
import { vcsFileHistoryTool } from "./tools/vcsFileHistory";
import { vcsFileSplitTool } from "./tools/vcsFileSplit";
import { vcsHunkListTool } from "./tools/vcsHunkList";
import { vcsHunkSplitTool } from "./tools/vcsHunkSplit";
import { vcsLogTool } from "./tools/vcsLog";
import { vcsOplogTool } from "./tools/vcsOplog";
import {
  isVcsTool,
  vcsChipsOf,
  vcsToolPreviewOf,
  VcsToolRows,
} from "./components/VcsToolRows";

export const vcsPlugin = definePlugin(
  "vcs",
  {
    title: "Change stack",
    summary:
      "jj as ten tools and two panels: the change stack, the operation log, splits, hunks and patches.",
    icon: "commit",
    category: "project",
  },
  (app) => {
    app.tools.register(
      vcsLogTool,
      vcsFileDiffTool,
      vcsFileHistoryTool,
      vcsFileHistoryShowTool,
      vcsConflictsTool,
      vcsOplogTool,
      vcsDescribeTool,
      vcsFileSplitTool,
      vcsHunkListTool,
      vcsHunkSplitTool,
    );

    app.log.rows({
      key: "vcs",
      owns: isVcsTool,
      body: (item) => <VcsToolRows item={item} />,
      preview: vcsToolPreviewOf,
      chips: vcsChipsOf,
    });

    // Both repo panels fill the band: the list on the left, the preview on the
    // right, and the keys of whichever half has the cursor. Core never asks which
    // component a repo panel is, and never holds the panel's state — this file says
    // what the panel is, and its own hook reads the repo for it.
    const changes: PanelSurface<ChangesPanelState> = {
      target: "changes",
      keybinding: "composer.changes",
      open: { type: "openChanges" },
      wide: true,
      choose: "open",
      use: (ctx) =>
        useChangesPanel({
          cwd: ctx.cwd,
          toast: ctx.toast,
          enabled: ctx.open,
          onPickText: ctx.actions.pickText,
          onInstruction: ctx.actions.sendInstruction,
        }),
      panel: (state) => ({
        node: <ChangesPanel panel={state} />,
        status: changesStatus(state),
        onKey: (event) => state.onKey(event),
      }),
      // A write asked for from the stack is confirmed over the window, not inside
      // the band that asked for it.
      overlay: (state) => <ChangesOverlayHost panel={state} />,
    };
    app.composer.panel(changes);

    const oplog: PanelSurface<OplogPanelState> = {
      target: "oplog",
      keybinding: "composer.oplog",
      open: { type: "openPick", target: "oplog" },
      wide: true,
      use: (ctx) =>
        useOplogPanel({ cwd: ctx.cwd, toast: ctx.toast, enabled: ctx.open }),
      panel: (state) => ({
        node: <OplogPanel panel={state} />,
        status: oplogStatus(state),
        onKey: (event) => state.onKey(event),
      }),
    };
    app.composer.panel(oplog);

    app.composer.command({
      name: "changes",
      description: "Browse the change stack, files and diffs",
      icon: "list",
      target: "changes",
    });
    app.composer.command({
      name: "oplog",
      description: "Browse jj's operation log and rewind the repo to one",
      icon: "history",
      target: "oplog",
    });
  },
);
