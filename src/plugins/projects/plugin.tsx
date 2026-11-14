/**
 * projects — the list of folders mu has worked in, and a window at any one of them.
 *
 * It registers no agent tool: choosing which project a window belongs to is a
 * thing the person does, not a thing the model is asked to do mid-turn. What it
 * registers is the panel and the command that opens it.
 */

import { definePlugin, type PanelSurface } from "../core/lib/plugin/manifest";
import { panelHints } from "../core/lib/composer/shortcuts";
import { useProjectsPanel } from "./hooks/useProjectsPanel";
import {
  projectRows,
  projectStatusText,
  projectsEmptyText,
} from "./lib/projectRows";
import { openProjectWindow, projectWindowNotice } from "./lib/openProject";
import type { ProjectsPanelApi } from "./types";

export const projectsPlugin = definePlugin(
  "projects",
  {
    title: "Projects",
    summary:
      "Every folder mu has sessions in, and a new window opened at the one you pick.",
    icon: "folder",
    category: "session",
  },
  (app) => {
    // The rows are built here rather than in the hook because they are measured
    // against the window: the query that left them standing and the folder this
    // window is standing in both come from the composer's data.
    const panel: PanelSurface<ProjectsPanelApi> = {
      target: "projects",
      keybinding: "composer.projects",
      open: { type: "openPick", target: "projects" },
      choose: "open",
      use: (ctx) => useProjectsPanel(ctx.open),
      panel: (state, data) => {
        const rows = projectRows(state.projects, data.query, data.cwd);
        return {
          rows,
          // One line per project — name, the folder it sits in, and its two
          // figures — so the field keeps its room and the store stays in view: a
          // windowed list of single-line rows shows twice the folders the tall
          // two-line list did in the same band.
          tall: true,
          total: state.projects.length,
          status: {
            message: projectStatusText(
              state.projects.length,
              data.query,
              rows.length,
            ),
            hints: panelHints("projects"),
          },
          busy: state.loading && rows.length === 0,
          busyText: "Reading the session store…",
          error: state.error ?? undefined,
          emptyText: projectsEmptyText(data.query),
        };
      },
      // A choice, and the panel puts itself away on it: the work moved to a window
      // that is now the one to type into, and this band has nothing left to do.
      pick: (row, _state, actions) => {
        void openProjectWindow(row.key).then((result) => {
          actions.toast(projectWindowNotice(result));
          if (result.ok) actions.close();
        });
      },
    };
    app.composer.panel(panel);

    app.composer.command({
      name: "projects",
      description: "Switch project — open a window at another folder",
      icon: "folder",
      target: "projects",
    });
  },
);
