/**
 * The plugin list as the panel says it.
 *
 * One row per plugin the app knows about — loaded or switched off — in the order
 * the registry declares them, which is the order the model sees their tools in.
 * Every figure on the row is something the host watched happen, so the panel can
 * not drift from what the app actually is: the counts come from the registrations,
 * the words come from the plugin's own identity, and a plugin that has been
 * switched off still takes a row so the thing that is missing has a name beside it.
 */

import type { IconName } from "adwaita-gpuix";
import type {
  ComposerPanelRow,
  ComposerRowFigure,
} from "../../components/composer/Composer";
import { HOST, PLUGINS } from "../../../registry";
import type { PluginRegistration } from "./manifest";
import { PLUGIN_CATEGORY_LABEL } from "./manifest";
import type { PluginContributions } from "./host";
import { pluginArmFile, pluginArming } from "./store";

const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`;

/**
 * What a plugin can give the window, in the order the panel's figures stand in.
 *
 * A contribution is a glyph and a count, in a column measured per kind over the
 * whole list — exactly how a session row's duration and age are drawn. The kinds'
 * words are not: "3 tools 1 panel 1 command 1 log surface 1 extension 1 block" is
 * fifty-eight characters of mono, which is wider than the row that also has to
 * hold this plugin's name, its folder, its category and the sentence about what it
 * does. A glyph and two digits cost a fifth of the row, and every kind keeps its
 * own column whether or not this plugin filled it, so the list reads as a table.
 */
const CONTRIBUTIONS: readonly {
  icon: IconName;
  count: (contributions: PluginContributions) => number;
}[] = [
  { icon: "widgets", count: (c) => c.tools.length },
  { icon: "dashboard", count: (c) => c.panels.length },
  { icon: "terminal", count: (c) => c.commands.length },
  { icon: "forum", count: (c) => c.rows.length },
  { icon: "extension", count: (c) => c.extensions },
  { icon: "shield", count: (c) => c.blocks },
];

/**
 * What one plugin did to this window, one figure per kind of contribution.
 *
 * Every kind takes a column whether or not this plugin filled it — a plugin that
 * registered no command still leaves the gap its count would have stood in — so
 * the list reads as a table down its whole length, and the table is what decides
 * how wide each of those columns is.
 */
function contributionFigures(
  contributions: PluginContributions,
): ComposerRowFigure[] {
  return CONTRIBUTIONS.map((kind) => {
    const count = kind.count(contributions);
    return {
      icon: count > 0 ? kind.icon : undefined,
      text: count > 0 ? String(count) : "",
    };
  });
}

/** The tools one plugin gave the model, which is what a search for a tool name matches on. */
function pluginToolNames(name: string): string[] {
  return HOST.contributionsFor(name).tools;
}

const searchable = (plugin: PluginRegistration, name: string): string =>
  [
    plugin.name,
    plugin.identity.title,
    plugin.identity.summary,
    PLUGIN_CATEGORY_LABEL[plugin.identity.category],
    pluginToolNames(name).join(" "),
  ]
    .join(" ")
    .toLowerCase();

export function pluginPanelRows(query = ""): ComposerPanelRow[] {
  const needle = query.trim().toLowerCase();
  const shown = PLUGINS.filter(
    (plugin) =>
      needle === "" || searchable(plugin, plugin.name).includes(needle),
  );
  return shown.map((plugin) => {
    const on = pluginArming.isOn(plugin.name);
    const contributions = HOST.contributionsFor(plugin.name);
    return {
      kind: "option",
      key: plugin.name,
      label: plugin.identity.title,
      icon: plugin.identity.icon,
      caption: `${plugin.name} · ${PLUGIN_CATEGORY_LABEL[plugin.identity.category]}`,
      description: on
        ? plugin.identity.summary
        : `${plugin.identity.summary} — switched off, its tools and panels are gone from the app`,
      // A switched-off plugin holds its figure columns empty: the row says what
      // it is in its sentence, and the table keeps every column where it was.
      figures: on
        ? contributionFigures(contributions)
        : CONTRIBUTIONS.map(() => ({ text: "" })),
      picked: on,
    } satisfies ComposerPanelRow;
  });
}

export function pluginStatusText(query: string, shown: number): string {
  const armed = PLUGINS.filter((plugin) =>
    pluginArming.isOn(plugin.name),
  ).length;
  const head =
    query.trim() === ""
      ? `${plural(PLUGINS.length, "plugin")} · ${armed} armed`
      : `${plural(shown, "match")} of ${plural(PLUGINS.length, "plugin")}`;
  return `${head} · switches apply at the next start · ${pluginArmFile()}`;
}

export function pluginsEmptyText(query: string): string {
  return query.trim() === ""
    ? "this build declares no plugins"
    : `no plugin matches ${JSON.stringify(query)}`;
}

/** Flip one plugin's arming and hand back the sentence the panel toasts. */
export function togglePlugin(name: string): string {
  return pluginArming.toggle(name);
}
