/**
 * What a plugin is, and the surfaces it can register.
 *
 * A plugin is a setup function plus the name it registers under. The function is
 * handed the host's API (`core/lib/plugin/host.ts`) and registers into it; the
 * app draws from the slots those registrations land in. That is the whole
 * abstraction: there is no table of plugin data core reads, and no plugin module
 * core reaches into — a plugin says what it provides to the host, once.
 *
 * A surface type here exists because something in core draws from it. Add one and
 * you must add the reader, or the registration is a feature nobody can use.
 */

import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import type { EventPayload } from "@gpuix/native";
import type { ToastFn } from "adwaita-gpuix";
import type { IconName } from "adwaita-gpuix";
import type { TSchema } from "typebox";
import type { SlashCommand } from "../../../../autocomplete";
import type { ComposerEvent, ComposerTarget } from "../composer/mode";
import type { ComposerPanelData } from "../composer/panelData";
import type {
  ComposerPanelRow,
  ComposerPanelStatusSpec,
  ComposerPreviewSpec,
} from "../../components/composer/Composer";
import type { ToolTranscriptItem } from "../agent/transcriptState";
import type { JSX, ReactNode } from "react";
import type { PluginApi } from "./host";

/**
 * A tool as a plugin registers it.
 *
 * pi's own `ToolDefinition` is invariant in its parameter schema, because
 * `renderCall` takes the arguments — which is why pi types one heterogeneous list
 * as the bare default and mu has to cast at that list. The host holds every
 * plugin's real tools, so the wide type is named here and `agentTools` hands the
 * list back to pi at the one boundary that has to take it.
 *
 * `icon` is mu's own field, and it belongs to the tool rather than to the log: the
 * mark a call wears is part of what the tool *is*, so core keeps no table of
 * plugin tools and adding one stays one file in `tools/` plus one line in
 * `plugin.tsx`. The host refuses a tool that names no mark — a row that quietly
 * loses its glyph is a feature nobody can report.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface PluginTool<
  TParams extends TSchema = any,
  TDetails = any,
  TState = any,
> extends ToolDefinition<TParams, TDetails, TState> {
  /** the mark this tool's row wears in the log */
  icon: IconName;
};

/** One plugin's claim on how its tool calls are drawn in the log. */
export interface ToolRowSurface {
  /** the surface's name, which is the React key of the rows it draws */
  key: string;

  /** which tool calls this surface draws */
  owns(toolName: string): boolean;

  /**
   * the call's own answer: the lines it quoted, the rows it ranked, the figure it
   * painted. Framed by `frame`, which is core's, not the plugin's.
   */
  body?(item: ToolTranscriptItem): JSX.Element;

  /**
   * how the body is framed. `band` is the log's one plate and is the default;
   * `page` says the body brings its own page, which is true of exactly one kind
   * of answer — a program screen, whose `Pane` is already the band's colour, so a
   * band under it is a card inside a card.
   */
  frame?: "band" | "page";

  /**
   * the whole log row, header included, for a plugin whose rows replace the
   * shared tool row entirely rather than filling its body.
   */
  row?(item: ToolTranscriptItem): JSX.Element;

  /** the tool header's one line, in the plugin's own words */
  preview?(item: ToolTranscriptItem): string;
}

/**
 * The composer services a panel's own state is built from.
 *
 * A panel makes its own state — its list, its cursor, its pending writes — and
 * these are the only facts of the window it is allowed to ask for. What a panel
 * keeps is never named in core: the type it returns is the plugin's own.
 */
export interface PanelServices {
  /** put a row's text into the draft and close the panel */
  pickText(text: string): void;

  /** ask the agent to do what the row names, in a turn of its own */
  sendInstruction(text: string): void;
}

/** What core hands a panel that builds its own state, on every render. */
export interface PanelContext {
  cwd: string;
  toast: ToastFn;

  /** the panel's filter, which for path completion is the draft itself */
  query: string;

  /** this panel is the one that is open, which is when its rows are worth reading */
  open: boolean;

  windowWidth: number | undefined;
  windowHeight: number | undefined;

  actions: PanelServices;
}

/** What a panel may do when one of its own rows is picked. */
export interface PanelPickActions {
  toast(message: string): void;
}

/**
 * A composer panel a plugin owns, and the way in to it.
 *
 * `State` is the panel's own shape. `use` builds it each render from the
 * composer's facts, and `panel` and `pick` are handed it back — so a plugin that
 * takes a panel takes it whole, and the composer's data bag names no plugin.
 */
export interface PanelSurface<State = any> {
  /** the id the composer's pick mode carries while the panel is open */
  target: ComposerTarget;

  /** the id in the app's keybinding table that opens it; absent for a panel a key other than a chord opens */
  keybinding?: string;

  /** the event that chord sends, so a panel may open with its own quirks */
  open: ComposerEvent;

  /**
   * a wide panel fills the band with its own list and status line and draws no
   * draft field above them, so its keys are its own and the chord that opened it
   * is the way out.
   *
   * It is declared rather than read from the view because the keymap has to know
   * it before anything is drawn: which chord closes the panel that is open.
   */
  wide?: boolean;

  /**
   * what the panel is, produced while it is open.
   *
   * One function, one shape. The panel takes the fields of the composer's data it
   * owns and returns what it shows — `rows` for the list core draws, `node` for a
   * panel that fills the band — with the words, the keys and the caveats only the
   * panel can name. Core keeps no panel's facts of its own.
   */
  /**
   * the panel's own state, built by the plugin's own hook on every render.
   *
   * It is a hook and it runs through the registry, which is sound because the
   * panel list is the host's and is fixed once the plugins are loaded: the same
   * surfaces, in the same order, render after render, so a panel's hooks are the
   * same hooks it had a moment ago.
   */
  use?(ctx: PanelContext): State;

  panel?(state: State, data: ComposerPanelData): PanelView;

  /**
   * what a pick on one of this panel's rows does. A panel that names none lets
   * the composer take its rows the way it takes any list.
   */
  pick?(row: ComposerPanelRow, state: State, actions: PanelPickActions): void;

  /**
   * what the panel puts over the window rather than in its band — a dialog a row
   * opened, which outlives the band that asked for it. Core frames nothing around
   * it: the panel brings the dialog.
   */
  overlay?(state: State): ReactNode;

  /** the word beside Enter in the panel's hint line; none means the panel offers no single choice */
  choose?: string;

  /**
   * the word beside Delete when the panel's highlighted row is a thing on disk
   * that can be deleted; a panel that names none never shows the hint, so the
   * hint is how a panel says its rows are deletable
   */
  deletes?: string;

  /**
   * the words beside `o` and `e` when the panel's rows are files that can be
   * handed to the desktop's default app or to the user's editor
   */
  opens?: string;

  /** the word beside `e` when a row can be opened in the editor */
  edits?: string;
}

/**
 * What a panel shows while it is open.
 *
 * A panel is one of two things and the shape says which: `rows` are the plain list
 * core draws, `node` is a component that fills the band. Everything else is a fact
 * only the panel can name — its keys, its status line, what it says while it is
 * still reading or when it has nothing to show — and core draws either through the
 * same chrome.
 */
export interface PanelView {
  rows?: readonly ComposerPanelRow[];
  node?: ReactNode;

  /** the panel's keys while it is open; true means the panel took the key */
  onKey?(event: EventPayload): boolean;

  /** the line under the panel: what it shows, and the keys it takes */
  status?: ComposerPanelStatusSpec;

  /** the band sized to this many rows rather than to the whole window */
  rowsForFit?: number;

  /** the list runs taller than one row, so the draft grows with the query */
  tall?: boolean;

  /** the rows are still being read */
  busy?: boolean;

  /** what the panel says while it reads, when that is not the default */
  busyText?: string;

  /** what went wrong reading the rows */
  error?: string;

  /** what the panel says when there is nothing to show */
  emptyText?: string;

  /** how many rows there are before the query and the cap, when the panel knows */
  total?: number;

  /** the line in the draft while the panel is open */
  placeholder?: string;

  /** a pane beside the rows, for the row under the cursor */
  preview?: ComposerPreviewSpec;
}

/** A slash command a plugin contributes. */
export interface CommandSurface extends SlashCommand {
  /** the panel the command opens, when the command opens one */
  target?: ComposerTarget;
}

/** What a plugin is called, and what it registers. */
export interface PluginRegistration {
  /** the plugin's name, which is the folder's name and the owner named in every refusal */
  name: string;

  /** what the plugin registers, handed the host's API */
  setup(api: PluginApi): void;
}

export type PluginSetup = (api: PluginApi) => void;

/**
 * Declare a plugin: its name, and the setup the host runs.
 *
 * The host does the checking as the setup registers, so a plugin with nothing to
 * register is legal — a plugin that only contributes a composer panel, or only an
 * extension, says so by what it registers rather than by a field set to an empty
 * list.
 */
export function definePlugin(
  name: string,
  setup: (api: PluginApi) => void,
): PluginRegistration {
  if (name.trim() === "")
    throw new Error("a plugin must name itself — the name is the owner in every refusal");
  return { name, setup };
}
