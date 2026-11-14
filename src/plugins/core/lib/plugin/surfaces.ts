/**
 * Reading the host's slots.
 *
 * Core asks the same five questions of the plugins and never names one of them:
 * what may the agent call, what runs inside the session, how is this call drawn,
 * which panel is open and how does it open, and what does its header say. Every
 * answer walks a slot the plugins registered into, in registration order, so the
 * only place the app's shape is written down is the plugin list itself.
 */

import type {
  ExtensionFactory,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import type { JSX } from "react";
import type { ToolTranscriptItem } from "../agent/transcriptState";
import type { ComposerEvent, ComposerTarget } from "../composer/mode";
import type { ComposerPanelData } from "../composer/panelData";
import type {
  CommandSurface,
  PanelSurface,
  PanelView,
  ToolRowSurface,
} from "./manifest";
import type { PluginHost } from "./host";

/**
 * What the agent may call beyond pi's own tools.
 *
 * The cast is the one mu spends: pi's own tool list is one type for every tool,
 * which cannot hold the parameter schema of each plugin's tools, so the widening
 * happens where the list stops being mu's. The host has already refused a name
 * claimed twice.
 */
export function agentTools(host: PluginHost): ToolDefinition[] {
  return host.slots.tools as ToolDefinition[];
}

/** The same tools as names: pi is told which tools are active by name. */
export function agentToolNames(host: PluginHost): string[] {
  return host.slots.tools.map((tool) => tool.name);
}

/** The pi extension factories the plugins run in every session. */
export function agentExtensions(host: PluginHost): ExtensionFactory[] {
  return host.slots.extensions;
}

/** Every log surface every plugin claimed, in registration order. */
export function rowSurfaces(host: PluginHost): ToolRowSurface[] {
  return host.slots.rows;
}

function claimedBy(
  host: PluginHost,
  item: ToolTranscriptItem,
): ToolRowSurface[] {
  return rowSurfaces(host).filter((surface) => surface.owns(item.name));
}

/** The whole log row of a call whose plugin draws the header too. */
export function dedicatedRowOf(
  host: PluginHost,
  item: ToolTranscriptItem,
): JSX.Element | null {
  for (const surface of claimedBy(host, item))
    if (surface.row !== undefined) return surface.row(item);
  return null;
}

/** The bodies a call answers with, unframed: the band is core's to draw. */
export function answerBodiesOf(
  host: PluginHost,
  item: ToolTranscriptItem,
): { key: string; frame: "band" | "page"; body: JSX.Element }[] {
  return claimedBy(host, item)
    .filter((surface) => surface.body !== undefined)
    .map((surface) => ({
      key: surface.key,
      frame: surface.frame ?? "band",
      // The host refused a surface with no body before it got here.
      body: surface.body?.(item) as JSX.Element,
    }));
}

/** A panel this call carries although its tool belongs to no plugin. */
export function blockBodiesOf(
  host: PluginHost,
  item: ToolTranscriptItem,
): { key: string; body: JSX.Element }[] {
  const bodies: { key: string; body: JSX.Element }[] = [];
  for (const block of host.slots.blocks) {
    const body = block.draw(item);
    if (body !== null && body !== undefined)
      bodies.push({ key: `${block.plugin}-block`, body });
  }
  return bodies;
}

/** The header's one line, in the owning plugin's words, or nothing to say. */
export function toolPreviewOf(
  host: PluginHost,
  item: ToolTranscriptItem,
): string | null {
  for (const surface of claimedBy(host, item))
    if (surface.preview !== undefined) return surface.preview(item);
  return null;
}

/**
 * Whether a call's rows say everything it answered, which is what keeps the log
 * from drawing its printed output underneath them as well. A call carrying a
 * block reason owns its rows for the same reason: the reason is the answer.
 */
export function ownsItsRows(
  host: PluginHost,
  item: ToolTranscriptItem,
): boolean {
  if (claimedBy(host, item).some((surface) => surface.body !== undefined))
    return true;
  return blockBodiesOf(host, item).length > 0;
}

/** The panel registered for a composer target, if a plugin owns it. */
export function panelForTarget(
  host: PluginHost,
  target: ComposerTarget,
): PanelSurface | null {
  return host.slots.panels.find((panel) => panel.target === target) ?? null;
}

/** Whether a target is a panel that fills the band instead of the list chrome. */
export const panelIsWide = (
  host: PluginHost,
  target: ComposerTarget,
): boolean => panelForTarget(host, target)?.wide === true;

/**
 * What the panel shows right now, in the panel's own words.
 *
 * This is the one call into a panel: core asks the owner, and draws what comes
 * back. A target no plugin owns, or one a plugin owns without saying what it
 * shows, answers null — which is what makes an unregistered target an empty
 * composer rather than a crash.
 */
export function panelViewOf(
  host: PluginHost,
  target: ComposerTarget,
  data: ComposerPanelData,
): PanelView | null {
  const surface = panelForTarget(host, target);
  if (surface?.panel === undefined) return null;
  return surface.panel(data);
}

/**
 * The word a panel puts beside a key in its hint line.
 *
 * A panel says what its rows are by naming the words: what Enter takes, whether
 * Delete has anything to delete, and whether `o` and `e` have a file to hand off.
 * A panel that names no word does not take that key, and its hint line says so.
 */
function panelWord(
  host: PluginHost,
  target: ComposerTarget | "commands",
  word: "choose" | "deletes" | "opens" | "edits",
): string | undefined {
  return host.slots.panels.find((panel) => panel.target === target)?.[word];
}

export const panelChooseWord = (
  host: PluginHost,
  target: ComposerTarget | "commands",
): string | undefined => panelWord(host, target, "choose");

export const panelDeleteWord = (
  host: PluginHost,
  target: ComposerTarget | "commands",
): string | undefined => panelWord(host, target, "deletes");

export const panelOpenWord = (
  host: PluginHost,
  target: ComposerTarget | "commands",
): string | undefined => panelWord(host, target, "opens");

export const panelEditWord = (
  host: PluginHost,
  target: ComposerTarget | "commands",
): string | undefined => panelWord(host, target, "edits");

/** The chord of every panel that has one, as the key router takes it. */
export function panelHotkeys(
  host: PluginHost,
): { id: string; event: ComposerEvent }[] {
  return host.slots.panels
    .filter((panel) => panel.keybinding !== undefined)
    .map((panel) => ({ id: panel.keybinding ?? "", event: panel.open }));
}

/** The chord that closes the wide panel that is open. */
export function wideHotkeyOf(
  host: PluginHost,
  target: ComposerTarget,
): string | null {
  const panel = panelForTarget(host, target);
  if (panel?.wide !== true || panel.keybinding === undefined) return null;
  return panel.keybinding;
}

/** Every slash command the plugins contribute. */
export function commandSurfaces(host: PluginHost): CommandSurface[] {
  return host.slots.commands;
}

/** The command a command-row picks, by name. */
export function commandByName(
  host: PluginHost,
  name: string,
): CommandSurface | null {
  return host.slots.commands.find((command) => command.name === name) ?? null;
}
