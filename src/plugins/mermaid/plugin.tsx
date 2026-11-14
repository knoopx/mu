/**
 * mermaid — one tool, and the picture is the answer.
 *
 * The band is the picture's page too, because an edge label's plate and a node's
 * interior are the colour of whatever they stand on; the tool ships markup and the
 * row paints it in the theme the window is wearing.
 */

import { definePlugin } from "../core/lib/plugin/manifest";
import { mermaidRenderTool } from "./tools/mermaidRender";
import {
  isMermaidTool,
  MermaidToolRows,
  mermaidToolPreviewOf,
} from "./components/MermaidToolRows";

export const mermaidPlugin = definePlugin("mermaid", (app) => {
  app.tools.register(mermaidRenderTool);

  app.log.rows({
    key: "mermaid",
    owns: isMermaidTool,
    body: (item) => <MermaidToolRows item={item} />,
    preview: mermaidToolPreviewOf,
  });
});
