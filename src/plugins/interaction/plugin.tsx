/**
 * interaction — the question the agent asks in the composer.
 *
 * One tool, one log body: the panel a person answers in is the composer's, so the
 * log's row only has to say what was asked and what came back.
 */

import { definePlugin } from "../core/lib/plugin/manifest";
import { askUserTool } from "./tools/askUser";
import { AskResultRows, isAskTool } from "./components/AskResultRows";
import { askToolPreviewOf } from "./lib/preview";

export const interactionPlugin = definePlugin(
  "interaction",
  {
    title: "Questions",
    summary:
      "The agent asks a multiple-choice question and you send the answer yourself.",
    icon: "forum",
    category: "agent",
  },
  (app) => {
    app.tools.register(askUserTool);

    app.log.rows({
      key: "ask",
      owns: isAskTool,
      body: (item) => <AskResultRows item={item} />,
      preview: askToolPreviewOf,
    });
  },
);
