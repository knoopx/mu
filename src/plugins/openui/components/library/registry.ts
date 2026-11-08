/**
 * The library, in one place: every component definition of every area, the
 * drawer each one paints with, and the groups the prompt and `openui-library`
 * print them in.
 *
 * This is the list a program can draw from. A component that is not here does
 * not exist: the parser drops it as `unknown-component`, and the renderer never
 * sees its name.
 */

import type { OpenUIGroupInfo } from "../../types";
import type { ProgramDrawer } from "./context";
import { Bar, Chart, Stat, Table } from "./data";
import {
  Divider,
  Grid,
  Pane,
  Row,
  Screen,
  Spacer,
  Stack,
} from "./layout";
import {
  Button,
  Choice,
  Field,
  Slider,
  Stepper,
  Toggle,
} from "./inputs";
import { Header, StatusLine } from "./screen";
import {
  Breakdown,
  Heatmap,
  Timeline,
  Trace,
  Tree,
} from "./figures";
import {
  Sections,
  Steps,
  Todos,
} from "./lists";
import {
  Badge,
  Caption,
  Code,
  Details,
  KeyValue,
  Note,
  Text,
  Title,
} from "./text";

export const programDefinitions = [
  Screen,
  Header,
  Stack,
  Row,
  Grid,
  Pane,
  Divider,
  Spacer,
  StatusLine,
  Title,
  Text,
  Caption,
  Badge,
  KeyValue,
  Note,
  Code,
  Details,
  Table,
  Stat,
  Bar,
  Chart,
  Tree,
  Timeline,
  Trace,
  Heatmap,
  Breakdown,
  Sections,
  Todos,
  Steps,
  Button,
  Toggle,
  Choice,
  Slider,
  Field,
  Stepper,
];

/**
 * What each name in the library draws with — read off the definitions, so a
 * component can be in the library and not have a drawer only by a type error.
 */
export const programDrawers: Record<string, ProgramDrawer> = Object.fromEntries(
  programDefinitions.map((definition) => [definition.name, definition.component]),
);

/** How the library is taught: what belongs together, and what each group obeys. */
export const programGroups: OpenUIGroupInfo[] = [
  {
    name: "Screen",
    components: ["Screen", "Header", "StatusLine"],
    notes: [
      "root is always a Screen: a header bar, the blocks it operates on, and one inert status line at the foot.",
      "A screen is a GNOME screen, not a web page — no wall of cards, no strip of figures with nothing to operate.",
    ],
  },
  {
    name: "Layout",
    components: ["Stack", "Row", "Grid", "Pane", "Divider", "Spacer"],
    notes: [
      "gap counts 4px steps: 1 is 4px, 3 is 12px, 6 is 24px. Leave it unset on a Stack and a Pane and the app uses its own tier.",
      "Pane groups one block of the screen. Never nest a Pane inside a Pane.",
    ],
  },
  {
    name: "Text",
    components: [
      "Title",
      "Text",
      "Caption",
      "Badge",
      "KeyValue",
      "Details",
      "Note",
      "Code",
    ],
    notes: [
      'Title "lg" and "xl" are for the screen, "sm" inside a Pane. Badge is one short fact, never a paragraph.',
      "KeyValue is one line; Details is the list of them — a spec sheet, a model's card — with a rule between the rows and the values on the right.",
    ],
  },
  {
    name: "Data",
    components: ["Table", "Stat", "Bar", "Chart"],
    notes: [
      "A Table is text cells in equal columns; a row is a list of cells. Stat and Bar are figures the screen reads out, not controls.",
      "Chart is the many-values-on-one-canvas primitive: Chart(points, \"bar\" | \"line\", height, width, grid, markers, fill, labels, tone, dash, emphasis). A point is [label, value], {label, value} or a bare number; more than one value on a row makes it multi-series. Reach for Chart when the set is the point, Bar when one figure is.",
      "A line that is a plan, not a measurement, is dashed (dash 7); `emphasis` is the index of the point the reader stands at. Bar takes `weight` (×N, when a figure counts more than the others) and `caption` (the line under it).",
      "A cell that reads as a number is set in mono and stands on the right of its column: write the figure, do not pad it.",
    ],
  },
  {
    name: "Figures",
    components: ["Tree", "Timeline", "Trace", "Heatmap", "Breakdown"],
    notes: [
      "These draw a shape rather than cells: the files of a change, the spans of a run, the days of a period, the parts a total is made of.",
      "A row is a list of cells or an object of named fields — both read the same way, and the field names are in each signature.",
      "A figure needs the count that frames it: put it in the Pane's `trailing`, not in a Caption of its own above it.",
      "A count of what moved is coloured, not plain: Row([Text(\"+78\", \"sm\", \"success\"), Text(\"-9\", \"sm\", \"danger\")], 1). A Tree colours each path's own counts.",
    ],
  },
  {
    name: "Status",
    components: ["Sections", "Todos", "Steps"],
    notes: [
      "The states a row may name: done, running, current, pending, skipped, error — and their common words (complete, wip, todo, cancelled, failed) reach the same mark.",
      "A line the work is behind is struck through, not removed: a screen says what happened, including what was skipped.",
    ],
  },
  {
    name: "Inputs",
    components: ["Button", "Toggle", "Choice", "Slider", "Field", "Stepper"],
    notes: [
      "An input's bound argument is a $variable the screen writes with @Set or a binding — every input must change something on the page or ask the agent something with @ToAssistant.",
      "Every interaction is recorded and waits for the agent to read it with openui-events.",
    ],
  },
];
