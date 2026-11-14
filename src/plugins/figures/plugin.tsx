/**
 * figures — two tools, two shapes, one plugin.
 *
 * A plot and a tree are drawn from the data the call left in its details, never
 * from a bitmap, which is why a session resumed next week still shows them in the
 * theme it is wearing now. They are two row surfaces because the row of a plot and
 * the row of a tree are different widgets over different shapes.
 */

import { definePlugin } from "../core/lib/plugin/manifest";
import { chartRenderTool } from "./tools/chartRender";
import { treeRenderTool } from "./tools/treeRender";
import {
  ChartToolRows,
  chartChipsOf,
  chartToolPreviewOf,
  isChartTool,
} from "./components/ChartToolRows";
import {
  isTreeTool,
  TreeToolRows,
  treeChipsOf,
  treeToolPreviewOf,
} from "./components/TreeToolRows";

export const figuresPlugin = definePlugin(
  "figures",
  {
    title: "Figures",
    summary:
      "Charts and trees plotted in the log, and the plot read back as figures rather than as a picture.",
    icon: "insights",
    category: "surface",
  },
  (app) => {
    app.tools.register(chartRenderTool, treeRenderTool);

    app.log.rows({
      key: "chart",
      owns: isChartTool,
      body: (item) => <ChartToolRows item={item} />,
      preview: chartToolPreviewOf,
      chips: chartChipsOf,
    });
    app.log.rows({
      key: "tree",
      owns: isTreeTool,
      body: (item) => <TreeToolRows item={item} />,
      preview: treeToolPreviewOf,
      chips: treeChipsOf,
    });
  },
);
