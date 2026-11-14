import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { answer, ran, userTurn, usage } from "../turn";

/** The folder the registry reads its thirteen setups from, in registry order. */
const PLUGIN_FOLDERS = [
  "core",
  "code-quality",
  "guardrails",
  "figures",
  "github",
  "interaction",
  "mermaid",
  "openui",
  "planning",
  "snapcompact",
  "terminal",
  "vcs",
  "web-search",
].join("\n");

const REGISTRY_HEAD = [
  "const SETUP: PluginSetup[] = [",
  "  corePlugin,",
  "  codeQualityPlugin,",
  "  guardrailsPlugin,",
  "  figuresPlugin,",
  "  githubPlugin,",
  "  interactionPlugin,",
  "  mermaidPlugin,",
  "  openuiPlugin,",
  "  planningPlugin,",
  "  snapcompactPlugin,",
  "  terminalPlugin,",
  "  vcsPlugin,",
  "  webSearchPlugin,",
  "];",
].join("\n");

/**
 * What this build is made of: the human asks the app about itself, and the panel
 * answers with the registrations the host watched happen — every count on those
 * rows is something the app did while it booted, so the list cannot drift from
 * the build, and the prose below says the same figures the rows carry.
 */
export const PLUGIN_LIST_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-plugins",
    "what is this build actually made of? I want the list with what each one contributes, and how I take one away",
    0,
  ),
  ran("c-ls-plugins", "bash", { command: "ls src/plugins" }, PLUGIN_FOLDERS, 0),
  ran("c-read-registry", "read", { path: "src/plugins/registry.ts" }, REGISTRY_HEAD, 1),
  {
    ...answer(
      "a-plugins",
      "Thirteen plugins, and the panel under CTRL+SHIFT+A says what each one registered — those figures come from the host watching the registrations happen, so the list cannot drift from the build. core is the window itself: 10 panels, 9 commands, 1 log surface. The tools the model sees: openui 11, vcs 10, github 9, code-quality 6, guardrails 3, figures 2, and one each for interaction, mermaid, planning and web-search. Two of them are not tools at all: terminal is 1 panel and 1 command with no tool behind it, because a shell you type into is not something the agent reaches sideways, and snapcompact is 1 extension. Guardrails is the only one that brings all four: 3 tools, 1 panel, 1 command, 1 extension and the block it paints over a stopped call. To take one away: switch its row, or /plugins, and it is gone from the next start — its tools, panel, keybinding and command. core is the one row the panel refuses to switch off, and it is 13 plugins and 13 armed right now.",
    ),
    usage: usage(11_420, 610, 0, 1, 2),
  },
];
