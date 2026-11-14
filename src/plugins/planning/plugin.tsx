/**
 * planning — one tool, and the list is the whole state.
 *
 * The row of a plan is the plan itself, read from the steps the call left in its
 * details; the header already counts how far the work has got, so the row surface
 * registers no chips and no summary above the list.
 */

import { definePlugin } from "../core/lib/plugin/manifest";
import { planTool } from "./tools/plan";
import {
  isPlanTool,
  PlanToolRows,
  planToolPreviewOf,
} from "./components/PlanToolRows";

export const planningPlugin = definePlugin("planning", (app) => {
  app.tools.register(planTool);

  app.log.rows({
    key: "plan",
    owns: isPlanTool,
    body: (item) => <PlanToolRows item={item} />,
    preview: planToolPreviewOf,
  });
});
