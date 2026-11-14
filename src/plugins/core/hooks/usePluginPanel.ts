import { useCallback, useSyncExternalStore } from "react";
import { togglePlugin } from "../lib/plugin/panelRows";
import { pluginArming, type PluginArmState } from "../lib/plugin/store";

/**
 * What the plugins panel holds, and the one thing it does to a plugin.
 *
 * The rows are not here: they are built in the surface, where the theme the list
 * is drawn in and the filter it is narrowed by are both in hand, because every
 * column on a row is measured off the rows this query leaves. What this hook owns
 * is the arming — the user's own file, subscribed to so a switch redraws the row
 * it just flipped and the cursor stays where it was.
 */
export interface PluginPanelApi {
  /** the store's snapshot: it moves when a row is switched, which is what re-reads the list */
  arming: PluginArmState;

  toggle(name: string): string;
}

export function usePluginPanel(): PluginPanelApi {
  const arming = useSyncExternalStore(
    pluginArming.subscribe,
    pluginArming.getSnapshot,
    pluginArming.getSnapshot,
  );
  const toggle = useCallback((name: string): string => togglePlugin(name), []);

  return { arming, toggle };
}
