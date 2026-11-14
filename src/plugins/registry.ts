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

const PLUGINS: PluginRegistration[] = [
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

/** The loaded host: every surface the app draws from. */
export const HOST = createPluginHost(PLUGINS);
