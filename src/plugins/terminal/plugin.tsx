/**
 * terminal — a shell a person types into.
 *
 * It registers no agent tool on purpose: a shell the user owns is not something
 * the agent should reach sideways. What it does register is the panel — a wide one
 * whose keys belong to the program on the screen, so the only key the window keeps
 * is the chord that opened it.
 */

import { definePlugin } from "../core/lib/plugin/manifest";
import { TerminalPanel } from "./components/TerminalPanel";
import { terminalHints } from "./lib/shortcuts";

export const terminalPlugin = definePlugin("terminal", (app) => {
  // The panel is the screen the shell drew, at the size the shell was told it
  // has. Its status line says which shell and how much history is above it, and
  // its hint line says the one way out — every other key belongs to the program
  // on the screen, so the panel takes them before the window sees them.
  app.composer.panel({
    target: "terminal",
    keybinding: "composer.terminal",
    open: { type: "openPick", target: "terminal" },
    wide: true,
    panel: (data) => ({
      node: (
        <TerminalPanel
          view={data.terminal.view}
          grid={data.terminal.grid}
          note={data.terminal.note}
        />
      ),
      status: { message: data.terminal.status, hints: terminalHints() },
      onKey: (event) => data.terminal.onKey(event),
    }),
  });

  app.composer.command({
    name: "terminal",
    description: "Open a shell in the composer and keep it running",
    icon: "terminal",
    target: "terminal",
  });
});
