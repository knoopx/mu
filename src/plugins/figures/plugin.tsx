/**
 * figures — a plot, drawn from the data the call left behind.
 *
 * A plot is drawn from the figure in the call's `details`, never from a bitmap,
 * which is why a session resumed next week still shows it in the theme it is
 * wearing now. Its row surface is the plot's own widget over the plot's own shape.
 */

import { definePlugin } from "../core/lib/plugin/manifest";
import { chartRenderTool } from "./tools/chartRender";
import {
  ChartToolRows,
  chartChipsOf,
  chartToolPreviewOf,
  isChartTool,
} from "./components/ChartToolRows";

export const figuresPlugin = definePlugin(
  "figures",
  {
    title: "Figures",
    summary:
      "Charts plotted in the log, and the plot read back as figures rather than as a picture.",
    icon: "insights",
    category: "surface",
  },
  (app) => {
    app.tools.register(chartRenderTool);

    app.log.rows({
      key: "chart",
      owns: isChartTool,
      body: (item) => <ChartToolRows item={item} />,
      preview: chartToolPreviewOf,
      chips: chartChipsOf,
    });
  },
);
