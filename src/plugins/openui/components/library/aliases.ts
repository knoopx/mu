/**
 * The names mu's older programs wrote, still drawn and never taught.
 *
 * Matching the reference implementation renamed six components — `Pane` became
 * `Card`, `Stat` became `Metric`, `Note` became `Callout`, `Field` became
 * `Input`, `Heatmap` became `CalendarHeatmap`, `Breakdown` became
 * `SegmentedBar` — and a name that is renamed cannot keep two argument orders
 * under one spelling. So the retired names stay in the library, with the
 * argument order they always had, and the drawer they always had; what they are
 * missing is a place in `programGroups`, which is the list the prompt and
 * `openui-library` read. A program written a month ago therefore still paints,
 * and a program written today is taught the reference's name.
 *
 * Each of these is one definition over an existing drawer, and where the retired
 * name took the same slots it reuses that definition's own props: there is no
 * second implementation to keep in step. Where the slots differ — `Stat`'s
 * `delta` under the figure, `Heatmap`'s `values` — the retired order is spelled
 * out again, because that is the whole point of keeping the name.
 */

import { defineComponent } from "@openuidev/lang-core";
import { z } from "zod/v4";

import { cardProps, drawCard } from "./layout";
import { drawCallout, drawMetric } from "./content";
import { drawInput } from "./inputs";
import { drawBreakdown, drawHeatmap, heatLabelProps } from "./figures";
import { reactive } from "./context";

const RETIRED =
  "retired name: still drawn for programs that wrote it, never taught";

export const legacyDefinitions = [
  defineComponent({
    name: "Pane",
    description: `${RETIRED} — write Card`,
    props: cardProps,
    component: drawCard,
  }),

  defineComponent({
    name: "Stat",
    description: `${RETIRED} — write Metric`,
    props: z.object({
      label: z.union([z.string(), z.number()]),
      value: z.union([z.string(), z.number()]),
      delta: z.union([z.string(), z.number()]).nullable().optional(),
      tone: z.string().nullable().optional(),
      size: z.enum(["sm", "md", "lg", "xl"]).nullable().optional(),
    }),
    component: drawMetric,
  }),

  defineComponent({
    name: "Note",
    description: `${RETIRED} — write Callout`,
    props: z.object({
      text: z.string(),
      tone: z.string().nullable().optional(),
    }),
    component: drawCallout,
  }),

  defineComponent({
    name: "Field",
    description: `${RETIRED} — write Input`,
    props: z.object({
      value: reactive(z.string()),
      placeholder: z.string().nullable().optional(),
      label: z.string().nullable().optional(),
    }),
    component: drawInput,
  }),

  defineComponent({
    name: "Heatmap",
    description: `${RETIRED} — write CalendarHeatmap`,
    props: z.object({ values: z.array(z.any()), ...heatLabelProps }),
    component: drawHeatmap,
  }),

  defineComponent({
    name: "Breakdown",
    description: `${RETIRED} — write SegmentedBar`,
    props: z.object({
      total: z.union([z.string(), z.number()]),
      segments: z.array(z.any()),
      rows: z.array(z.any()),
      caption: z.union([z.string(), z.number()]).nullable().optional(),
      trailing: z.union([z.string(), z.number()]).nullable().optional(),
    }),
    component: drawBreakdown,
  }),
];
