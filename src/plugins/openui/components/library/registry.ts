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

/**
 * How the library is grouped: which components belong together.
 *
 * `notes` is empty for every group, and stays that way. Each group used to
 * carry a paragraph of style doctrine ("a GNOME screen, not a web page", "never
 * nest a Pane inside a Pane", "a count is coloured, not plain"), and that prose
 * was neither checked against the drawers nor stated by any code: it was
 * invented here and then read back as if the library enforced it. What a group
 * is made of is the fact; the shape of a screen is the reader's decision.
 *
 * The field remains because `OpenUIGroupInfo` and `openui-library` print it.
 * A note worth keeping is one a drawer actually implements — and then it belongs
 * in that component's own `description`, where the parser and the renderer both
 * have to agree with it.
 */
export const programGroups: OpenUIGroupInfo[] = [
  {
    name: "Screen",
    components: ["Screen", "Header", "StatusLine"],
    notes: [],
  },
  {
    name: "Layout",
    components: ["Stack", "Row", "Grid", "Pane", "Divider", "Spacer"],
    notes: [],
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
    notes: [],
  },
  {
    name: "Data",
    components: ["Table", "Stat", "Bar", "Chart"],
    notes: [],
  },
  {
    name: "Figures",
    components: ["Tree", "Timeline", "Trace", "Heatmap", "Breakdown"],
    notes: [],
  },
  {
    name: "Status",
    components: ["Sections", "Todos", "Steps"],
    notes: [],
  },
  {
    name: "Inputs",
    components: ["Button", "Toggle", "Choice", "Slider", "Field", "Stepper"],
    notes: [],
  },
];
