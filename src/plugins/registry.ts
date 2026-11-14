/**
 * Every plugin mu runs, loaded into one host, in the order it runs them.
 *
 * This list is the app's shape in one place: the tools the agent may call, the pi
 * extensions every session loads, whose rows draw which calls, which plugin owns
 * which composer panel and which slash command opens it. `core` is loaded first
 * because it registers the window's own surfaces; after it the plugins are listed
 * in the order their tools reach the model, which is the order the system prompt
 * sees them in. Adding a plugin is one folder with one `plugin.tsx` and one line
 * here — nothing in core has to learn its name, and a name taken twice stops the
 * boot in the host that was asked to take it.
 */

import { createPluginHost } from "./core/lib/plugin/host";
import type { PluginRegistration } from "./core/lib/plugin/manifest";
import { pluginArming } from "./core/lib/plugin/store";
import { codeQualityPlugin } from "./code-quality/plugin";
import { corePlugin } from "./core/plugin";
import { figuresPlugin } from "./figures/plugin";
import { githubPlugin } from "./github/plugin";
import { guardrailsPlugin } from "./guardrails/plugin";
import { interactionPlugin } from "./interaction/plugin";
import { mermaidPlugin } from "./mermaid/plugin";
import { openUIPlugin } from "./openui/plugin";
import { planningPlugin } from "./planning/plugin";
import { snapcompactPlugin } from "./snapcompact/plugin";
import { terminalPlugin } from "./terminal/plugin";
import { vcsPlugin } from "./vcs/plugin";
import { webSearchPlugin } from "./web-search/plugin";

/** Every plugin the build declares, in the order the model sees their tools. */
export const PLUGINS: PluginRegistration[] = [
  corePlugin,
  interactionPlugin,
  webSearchPlugin,
  githubPlugin,
  guardrailsPlugin,
  vcsPlugin,
  codeQualityPlugin,
  openUIPlugin,
  mermaidPlugin,
  figuresPlugin,
  planningPlugin,
  snapcompactPlugin,
  terminalPlugin,
];

/**
 * The loaded host: every surface the app draws from.
 *
 * The arming is read before the host is built, so the plugins the user switched
 * off never get to register a tool, a panel or a keybinding; the host keeps them
 * named in `disarmed` so the plugins panel can show what is off and what it would
 * have given the app. This is the only moment the choice is honoured — the host's
 * slots are the app's shape, and a shape taken away mid-session leaves the system
 * prompt, the open panels and the keymap remembering three different apps.
 */
export const HOST = createPluginHost(PLUGINS, {
  disarmed: pluginArming.disabledNames(),
});
