import { AgentBridge, type ThinkingLevel } from "../agent/agentService";
import type { SlashCommand } from "../../../../autocomplete";
import type { ComposerPanelRow } from "../../components/composer/Composer";
import type { ComposerTarget } from "./mode";

export function matchesQuery(
  query: string,
  ...fields: Array<string | undefined>
): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;
  return fields.some((f) => (f ?? "").toLowerCase().includes(q));
}

export function modelValue(bridge: AgentBridge): string {
  return bridge.model ? `${bridge.model.provider}/${bridge.model.id}` : "";
}

export function asThinkingLevel(value: string): ThinkingLevel {
  return value as ThinkingLevel;
}

export function modelRows(
  bridge: AgentBridge,
  filter: string,
): ComposerPanelRow[] {
  const picked = modelValue(bridge);
  return bridge.availableModels
    .filter((m) => matchesQuery(filter, `${m.provider}/${m.id}`, m.name))
    .map((m) => ({
      kind: "option" as const,
      key: `${m.provider}/${m.id}`,
      label: `${m.provider}/${m.id}`,
      description: m.name,
      picked: `${m.provider}/${m.id}` === picked,
    }));
}

export function thinkingRows(
  bridge: AgentBridge,
  filter: string,
): ComposerPanelRow[] {
  return bridge.thinkingLevels
    .filter((level) => matchesQuery(filter, level))
    .map((level) => ({
      kind: "option" as const,
      key: level,
      label: level,
      picked: level === bridge.thinkingLevel,
    }));
}

export function composerPlaceholder(): string {
  return "Type a message";
}

export const PANEL_PLACEHOLDER: Record<
  ComposerTarget | "commands",
  string | undefined
> = {
  // A placeholder names what the field holds; it is never the sentence that
  // teaches the panel. Every one of these panels already prints its keys in the
  // hint bar under the list and its own figures in the status line, so the field
  // only has to say what to type — the way `Search` beats `Search anything...`.
  commands: "Command",
  model: "Model",
  thinking: "Thinking level",
  session: "Filter sessions",
  file: "Filter files",
  path: "Path",
  changes: undefined,
  oplog: undefined,
  tree: "Filter points",
  theme: "Theme",
  accent: "Accent",
  userMessageHistory: "Search your messages",
  guardrails: "Filter domains",
  // The figures on a plugin row are a glyph and a count, so the placeholder says
  // what the six columns are, in order — the one place in the panel with room for
  // the words.
  plugins:
    "Filter plugins — figures: tools · panels · commands · surfaces · extensions · blocks",
  // A terminal draws a screen, not a list to narrow, so it has nothing to ask the
  // draft for.
  terminal: undefined,
  projects: "Filter projects",
};

export const panelPlaceholder = (
  panel: ComposerTarget | "commands",
): string | undefined => PANEL_PLACEHOLDER[panel];

const PANEL_NOUNS: Record<string, [string, string]> = {
  commands: ["command", "commands"],
  model: ["model", "models"],
  thinking: ["level", "levels"],
  session: ["session", "sessions"],
  file: ["file", "files"],
  path: ["path", "paths"],
  changes: ["change", "changes"],
  oplog: ["operation", "operations"],
  tree: ["point", "points"],
  theme: ["theme", "themes"],
  accent: ["accent colour", "accent colours"],
  userMessageHistory: ["user message", "user messages"],
  guardrails: ["guardrail row", "guardrail rows"],
  projects: ["project", "projects"],
};

const panelNoun = (
  panel: ComposerTarget | "commands",
  count: number,
): string => {
  const [one, many] = PANEL_NOUNS[panel];
  return count === 1 ? one : many;
};

export function panelStatusText(
  panel: ComposerTarget | "commands",
  visible: number,
  total: number | undefined,
  query = "",
): string {
  if (query.trim().length > 0)
    return total === undefined
      ? `${visible} ${panelNoun(panel, visible)} match`
      : `${visible} of ${total} ${panelNoun(panel, visible)}`;
  return total === undefined
    ? `${visible} ${panelNoun(panel, visible)}`
    : `${total} ${panelNoun(panel, total)}`;
}

export function cappedPanelStatusText(
  panel: ComposerTarget | "commands",
  total: number,
  visible: number,
  query: string,
  cap: number,
  belowCapTail: string,
): string {
  if (query.trim().length > 0)
    return `${visible} of ${total} ${panelNoun(panel, visible)}`;
  const count = `${total} ${panelNoun(panel, total)}`;
  return total >= cap ? `${count} · newest first` : `${count} ${belowCapTail}`;
}

export const commandRow = (command: SlashCommand): ComposerPanelRow => ({
  kind: "command" as const,
  key: command.name,
  name: command.name,
  args: command.args,
  description: command.description,
  icon: command.icon,
});

export function commandRows(
  commands: readonly SlashCommand[],
  filter = "",
): ComposerPanelRow[] {
  return commands
    .filter((command) =>
      matchesQuery(filter, command.name, command.description),
    )
    .map(commandRow);
}
