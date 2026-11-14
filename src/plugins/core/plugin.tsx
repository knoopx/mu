/**
 * core — the app itself.
 *
 * It registers no agent tool: pi's five built-ins and pi's codemode are pi's, and
 * pi's are named by pi. What core registers is the rest of the window's own
 * surfaces — the codemode rows, because a script answers with what it printed and
 * the calls it made; the nine composer panels the window opens from its keymap;
 * and the eight slash commands that open them. Core uses the same API every plugin
 * is written against, which is what keeps that API from growing a plugin-only side
 * door.
 */

import { definePlugin, type PanelSurface } from "./lib/plugin/manifest";
import { usePluginPanel, type PluginPanelApi } from "./hooks/usePluginPanel";
import { SessionTreePanel } from "./components/SessionTreePanel";
import { panelIndex } from "./lib/composer/mode";
import { PANEL_FIT_MIN_ROWS } from "./lib/composer/panelHeight";
import {
  panelHints,
  pathCompletionHints,
  userMessageHistoryHints,
} from "./lib/composer/shortcuts";
import {
  userMessageHistoryRows,
  userMessageHistoryStatusText,
} from "./lib/composer/userMessageHistory";
import {
  completionPathOf,
  directorySummary,
  pathCompletionRows,
  pathStatusText,
} from "./lib/composer/pathCompletion";
import { fileRows } from "./lib/files/fileList";
import { sessionRows, sessionStatusText } from "./lib/session/sessionRows";
import {
  pluginPanelRows,
  pluginStatusText,
  pluginsEmptyText,
} from "./lib/plugin/panelRows";
import { TREE_HINTS } from "./lib/session/shortcuts";
import {
  CodemodeToolRows,
  isCodemodeTool,
} from "./components/CodemodeToolRows";
import { codemodePreviewOf } from "./lib/codemode/script";
import { accentNameList, themeNameList } from "./lib/theme/themeStore";

export const corePlugin = definePlugin(
  "core",
  {
    title: "The window",
    summary:
      "The log, the composer and the pickers every other plugin hangs from, registered through the same API.",
    icon: "dashboard",
    category: "core",
  },
  (app) => {
    app.log.rows({
      key: "codemode",
      owns: isCodemodeTool,
      // The script row draws its own band and leaves the wall time off it: the
      // time a script took is not part of what it printed, and a line of it inside
      // the plate reads as another line of output.
      frame: "page",
      body: (item) => <CodemodeToolRows item={item} />,
      preview: codemodePreviewOf,
    });

    // The window's own panels, registered the same way every plugin registers one:
    // each says what its rows are and what its status line says, and core draws the
    // list chrome around them. Nothing here is a fact core had to know about a
    // panel — it is core saying what its own panels are.
    app.composer.panel({
      target: "model",
      keybinding: "composer.models",
      open: { type: "openPick", target: "model" },
      choose: "use",
      panel: (_state, data) => ({
        rows: data.session?.modelRows(data.query) ?? [],
        total: data.session?.modelCount(),
      }),
    });
    app.composer.panel({
      target: "thinking",
      keybinding: "composer.thinking",
      open: { type: "openPick", target: "thinking" },
      choose: "set",
      panel: (_state, data) => ({
        rows: data.session?.thinkingRows(data.query) ?? [],
        total: data.session?.thinkingCount(),
      }),
    });
    app.composer.panel({
      target: "session",
      keybinding: "composer.sessions",
      open: { type: "openPick", target: "session" },
      choose: "resume",
      deletes: "delete",
      panel: (_state, data) => {
        const rows = sessionRows(data.sessionRows, data.query);
        return {
          rows,
          tall: true,
          busy: data.sessionsLoading,
          busyText: "Reading sessions…",
          error: data.sessionsError ?? undefined,
          emptyText: "No sessions for this folder",
          status: {
            message: sessionStatusText(
              data.sessionRows.length,
              data.query,
              rows.length,
            ),
            hints: panelHints("session"),
          },
        };
      },
    });
    app.composer.panel({
      target: "file",
      keybinding: "composer.files",
      open: { type: "openPick", target: "file" },
      choose: "insert",
      deletes: "delete file",
      opens: "open",
      edits: "edit",
      panel: (_state, data) => {
        const rows = fileRows(data.cwd, data.query);
        const active = rows[panelIndex(data.mode, rows.length)];
        return {
          rows,
          ...(active === undefined || active.kind !== "option"
            ? {}
            : { preview: data.previewFor(active.key) }),
        };
      },
    });
    // Path completion is the draft in another shape: Tab opens it out of the text
    // being typed, so it has no chord of its own. Its preview pane shows the folder
    // a highlighted name would lead to, which is the one thing a file preview can't.
    app.composer.panel({
      target: "path",
      open: { type: "openPick", target: "path" },
      choose: "use",
      panel: (_state, data) => {
        const rows = pathCompletionRows(data.query, data.cwd);
        const active = rows[panelIndex(data.mode, rows.length)];
        let preview = {};
        if (active !== undefined && active.kind === "option") {
          const spec = data.previewFor(completionPathOf(active.key, data.cwd));
          const note = directorySummary(active.key, data.cwd);
          preview = { preview: note === undefined ? spec : { ...spec, note } };
        }
        return {
          rows,
          tall: true,
          emptyText: "No path matches",
          status: {
            message: pathStatusText(data.query, rows.length),
            hints: pathCompletionHints(),
          },
          ...preview,
        };
      },
    });
    app.composer.panel({
      target: "userMessageHistory",
      keybinding: "composer.userMessageHistory",
      open: { type: "openPick", target: "userMessageHistory" },
      choose: "use",
      panel: (_state, data) => {
        const rows = userMessageHistoryRows(data.userMessages, data.query);
        return {
          rows,
          tall: true,
          busy: data.userMessagesLoading && rows.length === 0,
          busyText: "Reading user messages of all sessions…",
          error: data.userMessagesError ?? undefined,
          emptyText: "No user messages in this folder’s sessions",
          status: {
            message: userMessageHistoryStatusText(
              data.userMessages.length,
              data.query,
              rows.length,
            ),
            hints: userMessageHistoryHints(),
          },
        };
      },
    });
    // The conversation tree fills the band and sizes itself to the points it shows,
    // because a tree of six points should not be a window tall.
    app.composer.panel({
      target: "tree",
      keybinding: "composer.tree",
      open: { type: "openPick", target: "tree" },
      wide: true,
      choose: "jump",
      panel: (_state, data) => ({
        node: (
          <SessionTreePanel
            model={data.tree}
            sel={data.tree.sel}
            listRef={data.tree.listRef}
            onSelect={data.tree.select}
          />
        ),
        status: {
          message: `${data.tree.rows.length} of ${data.tree.total} points · ${data.tree.filterLabel}`,
          hints: TREE_HINTS,
        },
        onKey: (event) => data.tree.onKey(event),
        rowsForFit: Math.max(PANEL_FIT_MIN_ROWS, data.tree.rows.length),
      }),
    });
    app.composer.panel({
      target: "theme",
      keybinding: "composer.theme",
      open: { type: "openPick", target: "theme" },
      choose: "apply",
      panel: (_state, data) => ({
        rows: data.themePanel.rows,
        total: data.themePanel.total,
      }),
    });
    app.composer.panel({
      target: "accent",
      keybinding: "composer.accent",
      open: { type: "openPick", target: "accent" },
      choose: "apply",
      panel: (_state, data) => ({
        rows: data.themePanel.rows,
        total: data.themePanel.total,
      }),
    });

    // The plugin list is the one panel whose rows are the app itself: every row is
    // a plugin the registry declares, and the figures on it are the registrations the
    // host watched happen. Switching a row is the user's choice and the agent has no
    // part in it — the same line guardrails draws — and the panel says plainly that
    // the switch belongs to the next start, because the app that is already running
    // has already loaded what it loaded.
    const pluginsPanel: PanelSurface<PluginPanelApi> = {
      target: "plugins",
      keybinding: "composer.plugins",
      open: { type: "openPick", target: "plugins" },
      choose: "switch",
      use: () => usePluginPanel(),
      // The rows are built here, not in the hook, because their columns are
      // measured: they need the theme they are drawn in and the query that left
      // them standing.
      panel: (_state, data) => {
        const rows = pluginPanelRows(data.query);
        return {
          rows,
          status: {
            message: pluginStatusText(data.query, rows.length),
            hints: panelHints("plugins"),
          },
          emptyText: pluginsEmptyText(data.query),
        };
      },
      // A switch, not a choice: the panel stays open and the cursor stays put, so the
      // row can be flipped and read back in its new state.
      pick: (row, state, actions) => {
        actions.toast(state.toggle(row.key));
      },
    };
    app.composer.panel(pluginsPanel);

    app.composer.command({
      name: "model",
      description: "Load a model by name",
      icon: "layers",
      args: "name",
      target: "model",
    });
    app.composer.command({
      name: "thinking",
      description: "How long the model thinks first",
      icon: "autoAwesome",
      args: "off | low | medium | high",
      target: "thinking",
    });
    app.composer.command({
      name: "compact",
      description: "Compact the session context",
      icon: "inbox",
    });
    app.composer.command({
      name: "new",
      description: "Start a new chat",
      icon: "add",
    });
    app.composer.command({
      name: "resume",
      description: "Resume an existing session",
      icon: "schedule",
      args: "session",
      target: "session",
    });
    app.composer.command({
      name: "theme",
      description: "Switch the theme with a live preview",
      icon: "darkMode",
      args: themeNameList(),
      target: "theme",
    });
    app.composer.command({
      name: "accent",
      description: "Switch the accent colour with a live preview",
      icon: "palette",
      args: accentNameList(),
      target: "accent",
    });
    app.composer.command({
      name: "tree",
      description: "Jump back to an earlier point in this session",
      icon: "accountTree",
      target: "tree",
    });
    app.composer.command({
      name: "plugins",
      description: "List what this build is made of, and switch a plugin off",
      icon: "extension",
      target: "plugins",
    });
  },
);
