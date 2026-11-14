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

import { definePlugin } from "../core/lib/plugin/manifest";
import { panelHints } from "../core/lib/composer/shortcuts";
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

export const guardrailsPlugin = definePlugin("guardrails", (app) => {
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

  app.composer.panel({
    target: "guardrails",
    keybinding: "composer.guardrails",
    open: { type: "openPick", target: "guardrails" },
    choose: "arm",
    // The panel's rows are the domains and each wears whether it is armed; what
    // the panel says when there are no rules is the panel's own news, not a
    // generic "no matches".
    panel: (data) => ({
      rows: [...data.guardrails.rows],
      status: {
        message: data.guardrails.statusText,
        hints: panelHints("guardrails"),
      },
      emptyText: data.guardrails.emptyText,
    }),
  });

  app.composer.command({
    name: "guardrails",
    description: "Arm the guardrail domains",
    icon: "shield",
    target: "guardrails",
  });
});
