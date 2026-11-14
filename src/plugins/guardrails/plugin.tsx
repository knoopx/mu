/**
 * guardrails — three tools, one extension, and the one panel the log draws onto a
 * call its own plugin never registered.
 *
 * The tools write and grade the rule suites; the extension is what stops a call;
 * and a blocked call's row carries the reason, whether the call was one of mu's
 * tools or pi's — which is why the block is registered through `app.log.block`
 * rather than as a row surface. The panel is the user's: it arms and disarms the
 * domains, and the agent has no say in either.
 */

import {
  definePlugin,
  type PanelSurface,
} from "../core/lib/plugin/manifest";
import { panelHints } from "../core/lib/composer/shortcuts";
import { useGuardrailsPanel } from "./hooks/useGuardrails";
import type { GuardrailsPanelApi } from "./types";
import { guardrailsExtension } from "./lib/guardrailsExtension";
import { guardrailsCoverageTool } from "./tools/guardrailsCoverage";
import { guardrailsFixtureUpdateTool } from "./tools/guardrailsFixtureUpdate";
import { guardrailsTestTool } from "./tools/guardrailsTest";
import {
  GuardrailsToolRows,
  guardrailsToolPreview,
  isGuardrailsTool,
} from "./components/GuardrailsToolRows";
import {
  GuardrailBlockRows,
  guardrailBlockOf,
} from "./components/GuardrailBlockRows";

export const guardrailsPlugin = definePlugin(
  "guardrails",
  {
    title: "Guardrails",
    summary:
      "Tree-sitter rules that stop a tool call before it runs, armed per domain from a panel.",
    icon: "shield",
    category: "safety",
  },
  (app) => {
    app.tools.register(
      guardrailsTestTool,
      guardrailsFixtureUpdateTool,
      guardrailsCoverageTool,
    );

    app.extensions.register(guardrailsExtension);

    app.log.rows({
      key: "guardrails",
      owns: isGuardrailsTool,
      body: (item) => <GuardrailsToolRows item={item} />,
      preview: guardrailsToolPreview,
    });

    app.log.block((item) => {
      const hit = guardrailBlockOf(item);
      return hit === null ? null : <GuardrailBlockRows hit={hit} />;
    });

    // The panel reads the domains, arms them, and says what it has to say about an
    // empty rule set — all of it its own state, built by its own hook. The composer
    // holds that state by target and hands it back, and never reads it.
    const panel: PanelSurface<GuardrailsPanelApi> = {
      target: "guardrails",
      keybinding: "composer.guardrails",
      open: { type: "openPick", target: "guardrails" },
      choose: "arm",
      use: (ctx) => useGuardrailsPanel(ctx.query, ctx.open),
      panel: (state) => ({
        rows: [...state.rows],
        status: {
          message: state.statusText,
          hints: panelHints("guardrails"),
        },
        emptyText: state.emptyText,
      }),
      // Arming is a switch, not a choice: the panel stays open and the cursor stays
      // put, so the row can be flipped and read again.
      pick: (row, state, actions) => {
        actions.toast(state.toggle(row.key));
      },
    };
    app.composer.panel(panel);

    app.composer.command({
      name: "guardrails",
      description: "Arm the guardrail domains",
      icon: "shield",
      target: "guardrails",
    });
  },
);
