/**
 * vcs — ten tools over the change-tracking CLI, and the two panels the repo is
 * read through.
 *
 * The panel writes and the tools read go through the same library; what this file
 * registers is the surface: how a call's answer is drawn, the two wide panels and
 * the chords that open them, and the two commands that open them from the draft.
 * `changes` opens with its own event because it keeps the query it was left with.
 */

import { definePlugin } from "../core/lib/plugin/manifest";
import { ChangesPanel } from "./components/ChangesPanel";
import { OplogPanel } from "./components/OplogPanel";
import { changesStatus, oplogStatus } from "./lib/panelStatus";
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
  vcsToolPreviewOf,
  VcsToolRows,
} from "./components/VcsToolRows";

export const vcsPlugin = definePlugin("vcs", (app) => {
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
  });

  // Both repo panels fill the band: the list on the left, the preview on the
  // right, and the keys of whichever half has the cursor. Core never asks which
  // component a repo panel is — this file says so.
  app.composer.panel({
    target: "changes",
    keybinding: "composer.changes",
    open: { type: "openChanges" },
    wide: true,
    choose: "open",
    panel: (data) => ({
      node: <ChangesPanel panel={data.changes} />,
      status: changesStatus(data.changes),
      onKey: (event) => data.changes.onKey(event),
    }),
  });
  app.composer.panel({
    target: "oplog",
    keybinding: "composer.oplog",
    open: { type: "openPick", target: "oplog" },
    wide: true,
    panel: (data) => ({
      node: <OplogPanel panel={data.oplog} />,
      status: oplogStatus(data.oplog),
      onKey: (event) => data.oplog.onKey(event),
    }),
  });

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
});
