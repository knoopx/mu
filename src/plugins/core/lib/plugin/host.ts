/**
 * The plugin host: the API a plugin is written against.
 *
 * A plugin is a setup function, not a table of data. It is handed an API and it
 * registers into it — the tools the agent may call, the pi extensions every
 * session runs, the surfaces that draw its tool calls, the composer panels it
 * owns and the slash commands that open them. The host owns the slots those
 * registrations land in, and core draws from the slots, so the API is the only
 * path from a plugin into the app and the only path core itself uses. Core
 * registering its own panels, commands and rows through the same API is what
 * keeps the API honest: a surface the app cannot reach through it is a surface
 * that does not exist.
 *
 * Registration is checked as it happens. A name taken twice, a surface that owns
 * calls and draws nothing for them, a panel that answers to no keybinding: each
 * one throws with the plugin that did it in the message, because every one of
 * them is a feature the user quietly stops having.
 */

import type {
  ExtensionFactory,
} from "@earendil-works/pi-coding-agent";
import type {
  CommandSurface,
  PanelSurface,
  PluginRegistration,
  PluginSetup,
  ToolRowSurface,
  PluginTool,
} from "./manifest";
import type { ToolTranscriptItem } from "../agent/transcriptState";
import type { JSX } from "react";

/** What a plugin contributes, and what the app draws from. */
export interface PluginSlots {
  /** the tools the agent may call, in registration order */
  tools: PluginTool[];
  /** the pi extension factories every session loads */
  extensions: ExtensionFactory[];
  /** how a plugin's own tool calls are drawn in the log */
  rows: ToolRowSurface[];
  /** a panel drawn onto any tool's row, whichever plugin made the call */
  blocks: {
    plugin: string;
    draw: (item: ToolTranscriptItem) => JSX.Element | null;
  }[];
  /** the composer panels plugins own */
  panels: PanelSurface[];
  /** the slash commands plugins contribute */
  commands: CommandSurface[];
}

/** The API one plugin is handed. Everything it can ask of the app is here. */
export interface PluginApi {
  /** which plugin is registering, for the message of every refusal */
  readonly plugin: string;

  /** the agent's side of the plugin */
  tools: {
    /** register a tool the model may call */
    register(...tool: PluginTool[]): void;
  };

  /** the session's side: pi extensions the plugin runs in every session */
  extensions: {
    register(...factory: ExtensionFactory[]): void;
  };

  /** the log's side */
  log: {
    /** claim how a set of tool calls is drawn */
    rows(surface: ToolRowSurface): void;
    /** add a panel to any tool call's row, including another plugin's */
    block(draw: (item: ToolTranscriptItem) => JSX.Element | null): void;
  };

  /** the composer's side */
  composer: {
    /** take a panel of the composer, and the key that opens it */
    panel(surface: PanelSurface): void;
    /** contribute a slash command */
    command(surface: CommandSurface): void;
  };
}

export interface PluginHost {
  /** every plugin the host loaded, in registration order */
  readonly plugins: readonly PluginRegistration[];
  /** what they registered */
  readonly slots: PluginSlots;
}

/**
 * Load a list of plugins: hand each its API, run its setup, and keep what it
 * registered.
 *
 * The order is the order the model sees the tools in, so the list is written down
 * once — in `src/plugins/registry.ts` — rather than implied by import order.
 */
export function createPluginHost(
  plugins: readonly PluginRegistration[],
): PluginHost {
  const slots: PluginSlots = {
    tools: [],
    extensions: [],
    rows: [],
    blocks: [],
    panels: [],
    commands: [],
  };
  const owners = new Map<string, string>();
  const panelTargets = new Map<string, string>();
  const panelKeys = new Map<string, string>();
  const commandNames = new Map<string, string>();
  const rowKeys = new Set<string>();

  const claim = (
    taken: Map<string, string>,
    name: string,
    what: string,
    plugin: string,
  ): void => {
    const owner = taken.get(name);
    if (owner !== undefined)
      throw new Error(
        `plugin ${plugin} cannot take ${what} ${JSON.stringify(name)}: ${owner} already has it`,
      );
    taken.set(name, plugin);
  };

  const apiFor = (plugin: string): PluginApi => ({
    plugin,
    tools: {
      register(...tools: PluginTool[]): void {
        for (const tool of tools) {
          const name = tool?.name ?? "";
          if (name.trim() === "")
            throw new Error(`plugin ${plugin} registered a tool with no name`);
          claim(owners, name, "tool", plugin);
          slots.tools.push(tool);
        }
      },
    },
    extensions: {
      register(...factories: ExtensionFactory[]): void {
        for (const factory of factories) {
          if (typeof factory !== "function")
            throw new Error(`plugin ${plugin} registered an extension that is not a factory`);
          slots.extensions.push(factory);
        }
      },
    },
    log: {
      rows(surface: ToolRowSurface): void {
        if (surface === null || typeof surface.owns !== "function")
          throw new Error(`plugin ${plugin} claimed log rows it cannot name`);
        if (
          surface.body === undefined &&
          surface.row === undefined &&
          surface.preview === undefined
        )
          throw new Error(
            `plugin ${plugin} claimed the log rows ${JSON.stringify(surface.key)} and draws nothing for them`,
          );
        if (rowKeys.has(surface.key))
          throw new Error(
            `plugin ${plugin} took the log surface ${JSON.stringify(surface.key)} twice`,
          );
        rowKeys.add(surface.key);
        slots.rows.push(surface);
      },
      block(draw: (item: ToolTranscriptItem) => JSX.Element): void {
        if (typeof draw !== "function")
          throw new Error(`plugin ${plugin} registered a block panel that cannot draw`);
        slots.blocks.push({ plugin, draw });
      },
    },
    composer: {
      panel(surface: PanelSurface): void {
        if (surface === null || typeof surface.target !== "string")
          throw new Error(`plugin ${plugin} took a composer panel with no target`);
        claim(panelTargets, surface.target, "composer panel", plugin);
        // A band-filling panel has to say what fills it: `wide` is a layout fact
        // the keymap reads before anything is drawn, so a panel that claims the
        // band and shows nothing is a hole in the window.
        if (surface.wide === true && surface.panel === undefined)
          throw new Error(
            `plugin ${plugin}'s wide panel ${surface.target} registers nothing to draw`,
          );
        // A panel opened by something other than a chord — path completion opens
        // on Tab, from the draft — registers no keybinding and so no hotkey.
        if (surface.keybinding !== undefined && surface.keybinding.trim() !== "")
          claim(panelKeys, surface.keybinding, "keybinding", plugin);
        slots.panels.push(surface);
      },
      command(surface: CommandSurface): void {
        if (surface === null || surface.name.trim() === "")
          throw new Error(`plugin ${plugin} contributed a command with no name`);
        claim(commandNames, surface.name, "command", plugin);
        slots.commands.push(surface);
      },
    },
  });

  for (const plugin of plugins) {
    const setup: PluginSetup = plugin.setup;
    if (typeof setup !== "function")
      throw new Error(`plugin ${plugin.name} has no setup to run`);
    setup(apiFor(plugin.name));
  }

  return { plugins, slots };
}
