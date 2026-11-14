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
import type { ToolRowCell } from "../ui/toolRowPaint";
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
}

/** One plugin's claim on how its tool calls are drawn in the log. */
export interface ToolRowSurface {
  /** the surface's name, which is the React key of the rows it draws */
  key: string;

  /** which tool calls this surface draws */
  owns(toolName: string): boolean;

  /**
   * the call's own answer: the lines it quoted, the rows it ranked, the figure it
   * painted. Framed by `frame`, which is core's, not the plugin's. An answer with
   * nothing left to show says so with null and draws no plate at all — the header's
   * own line is then the whole row, which is the honest shape for a read that came
   * back empty.
   */
  body?(item: ToolTranscriptItem): JSX.Element | null;

  /**
   * how the body is framed. `band` is the log's one plate and is the default;
   * `page` says the body frames itself, and each of the three that ask for it has
   * its own reason: a program screen whose `Pane` is already the band's colour, so
   * a band under it is a card inside a card; a script row, which puts its input,
   * its calls and its output on three plates and keeps the time the run took off
   * them — a figure about the call is not another line of what the call printed;
   * and a record card, whose sections (the files a change moved, then what someone
   * said about them) each take a plate so the boundary between them is drawn.
   */
  frame?: "band" | "page";

  /**
   * the whole log row, header included, for a plugin whose rows replace the
   * shared tool row entirely rather than filling its body.
   */
  row?(item: ToolTranscriptItem): JSX.Element;

  /** the tool header's one line, in the plugin's own words */
  preview?(item: ToolTranscriptItem): string;

  /**
   * What the call ran with, as the chips that ride its header: the analyzer and its
   * thresholds, the canvas a diagram was laid out on, the rev a repo read stood at.
   * They belong to the header because they are the call, not its answer — and the
   * header's text gives way to them when the row runs out of room.
   */
  chips?(item: ToolTranscriptItem): readonly ToolRowCell[];
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

  /**
   * put the panel away.
   *
   * A panel whose pick is a switch keeps its band and its cursor — arming a
   * guardrail has to be readable back — but a panel whose pick sends the work
   * somewhere else has nothing left to show, and says so by closing itself.
   */
  close(): void;
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

/**
 * Which part of the app a plugin belongs to.
 *
 * The plugins panel groups its rows by this and nothing else reads it; it exists
 * so a reader can find a plugin by what it changes rather than by the accident of
 * its folder name. A vocabulary, not a free string: a category only groups when
 * every name in it means the same thing.
 */
export type PluginCategory =
  /** the app itself: the window's own surfaces */
  | "core"
  /** what the model can call */
  | "agent"
  /** reads of the repository, the project and the web */
  | "project"
  /** what an answer is painted as */
  | "surface"
  /** what may stop a tool call */
  | "safety"
  /** the session's own life: its context, its shell */
  | "session";

/** The word the plugins panel prints above each group. */
export const PLUGIN_CATEGORY_LABEL: Record<PluginCategory, string> = {
  core: "the app",
  agent: "agent tools",
  project: "project reads",
  surface: "answer surfaces",
  safety: "safety",
  session: "session",
};

export const PLUGIN_CATEGORIES = Object.keys(PLUGIN_CATEGORY_LABEL) as [
  PluginCategory,
  ...PluginCategory[],
];

/**
 * What a plugin is, in its own words.
 *
 * A plugin used to be only a folder name and a setup function, which meant the
 * app had nothing to say about it: no panel could list what the app is made of, a
 * refusal could only name a folder, and a plugin the user turned off left a hole
 * with no explanation. These four fields are the plugin's own answer to "what are
 * you", written where the plugin is defined rather than in a table core keeps.
 */
export interface PluginIdentity {
  /** what the plugins panel calls it — prose, not the folder name */
  title: string;

  /** one line: what the app has because this plugin is loaded */
  summary: string;

  /** the mark the panel draws for it */
  icon: IconName;

  /** which group of the app it belongs to */
  category: PluginCategory;
}

/** What a plugin is called, what it is, and what it registers. */
export interface PluginRegistration {
  /** the plugin's name, which is the folder's name and the owner named in every refusal */
  name: string;

  /** what the plugin says it is, checked when it is declared */
  identity: PluginIdentity;

  /** what the plugin registers, handed the host's API */
  setup(api: PluginApi): void;
}

export type PluginSetup = (api: PluginApi) => void;

/**
 * Declare a plugin: its name, what it is, and the setup the host runs.
 *
 * The host does the checking as the setup registers, so a plugin with nothing to
 * register is legal — a plugin that only contributes a composer panel, or only an
 * extension, says so by what it registers rather than by a field set to an empty
 * list. What is checked here is the identity, because a plugin that cannot say
 * what it is in one line is a plugin the plugins panel will have to invent a line
 * for — and an invented line is exactly the table this file exists to prevent.
 */
export function definePlugin(
  name: string,
  identity: PluginIdentity,
  setup: (api: PluginApi) => void,
): PluginRegistration {
  if (name.trim() === "")
    throw new Error(
      "a plugin must name itself — the name is the owner in every refusal",
    );
  const at = `plugin ${JSON.stringify(name)}`;
  if (typeof identity?.title !== "string" || identity.title.trim() === "")
    throw new Error(
      `${at} declares no title — the panel has to say what it is listing`,
    );
  if (typeof identity.summary !== "string" || identity.summary.trim() === "")
    throw new Error(
      `${at} declares no summary — one line saying what the app gains from it`,
    );
  if (identity.summary.includes("\n"))
    throw new Error(
      `${at}'s summary is more than one line — the panel draws it beside one row`,
    );
  if (typeof identity.icon !== "string" || identity.icon.trim() === "")
    throw new Error(`${at} declares no mark for itself`);
  if (!PLUGIN_CATEGORIES.includes(identity.category))
    throw new Error(
      `${at} claims the category ${JSON.stringify(String(identity.category))} — it is one of ${PLUGIN_CATEGORIES.join(", ")}`,
    );
  return { name, identity, setup };
}
