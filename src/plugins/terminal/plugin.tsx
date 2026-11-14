/**
 * terminal — a shell a person types into.
 *
 * It registers no agent tool on purpose: a shell the user owns is not something
 * the agent should reach sideways. What it does register is the panel — a wide one
 * whose keys belong to the program on the screen, so the only key the window keeps
 * is the chord that opened it.
 */

import {
  definePlugin,
  type PanelSurface,
} from "../core/lib/plugin/manifest";
import { TerminalPanel } from "./components/TerminalPanel";
import { terminalHints } from "./lib/shortcuts";
import { useTerminalPanel } from "./hooks/useTerminalPanel";
import type { TerminalPanelState } from "./types";

export const terminalPlugin = definePlugin("terminal", (app) => {
  // The panel is the screen the shell drew, at the size the shell was told it
  // has. Its status line says which shell and how much history is above it, and
  // its hint line says the one way out — every other key belongs to the program
  // on the screen, so the panel takes them before the window sees them.
  // The shell is started by the first open and kept for the window: closing the
  // panel puts the terminal away, it does not stop the program that was running in
  // it, and the panel that comes back shows the screen where it was left. That
  // session belongs to this plugin's hook, not to the window's panel wiring.
  const panel: PanelSurface<TerminalPanelState> = {
    target: "terminal",
    keybinding: "composer.terminal",
    open: { type: "openPick", target: "terminal" },
    wide: true,
    use: (ctx) =>
      useTerminalPanel({
        cwd: ctx.cwd,
        enabled: ctx.open,
        windowWidth: ctx.windowWidth,
        windowHeight: ctx.windowHeight,
      }),
    panel: (state) => ({
      node: (
        <TerminalPanel view={state.view} grid={state.grid} note={state.note} />
      ),
      status: { message: state.status, hints: terminalHints() },
      onKey: (event) => state.onKey(event),
    }),
  };
  app.composer.panel(panel);

  app.composer.command({
    name: "terminal",
    description: "Open a shell in the composer and keep it running",
    icon: "terminal",
    target: "terminal",
  });
});
