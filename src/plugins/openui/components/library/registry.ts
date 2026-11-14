/**
 * The library, in one place: every component definition of every area, the
 * drawer each one paints with, and the groups the prompt and `openui-library`
 * print them in.
 *
 * This is the list a program can draw from. A component that is not here does
 * not exist: the parser drops it as `unknown-component`, and the renderer never
 * sees its name.
 *
 * **The names and the groups are the reference implementation's.** The plugin
 * this one matches groups its catalogue as Layout, Content, Data, Inputs,
 * Widgets and Manage and names each thing one thing (`Card`, `Metric`,
 * `Callout`, `Input`, `CalendarHeatmap`, `SegmentedBar`), and the list below uses
 * those words so a program written against that reference draws here. mu's own
 * retired words for six of them still draw, in `legacyDefinitions` at the
 * bottom — they are in the library so an older program is not left blank, and
 * out of `programGroups` so nothing teaches them.
 *
 * A group is what the prompt teaches; the file a definition sits in is what
 * _kind of drawing_ it is: `figures.tsx` draws shapes, `data.tsx` rows and
 * meters, and both teach the Data group.
 */

import type { OpenUIGroupInfo } from "../../types";
import { legacyDefinitions as retiredDefinitions } from "./aliases";
import type { ProgramDrawer } from "./context";
import {
  Bar,
  Chart,
  Diff,
  Gauge,
  Progress,
  Snippet,
  Sparkline,
  Table,
} from "./data";
import {
  Carousel,
  Card,
  Details,
  Divider,
  Grid,
  Row,
  Screen,
  Spacer,
  Stack,
  Tabs,
} from "./layout";
import {
  Button,
  Checklist,
  Choice,
  DateInput,
  EditableTable,
  FollowUps,
  Form,
  Input,
  ListEditor,
  OptionCards,
  Radio,
  Rating,
  Select,
  Slider,
  Stepper,
  Swatches,
  TextArea,
  Toggle,
} from "./inputs";
import { Header, StatusLine } from "./screen";
import {
  CalendarHeatmap,
  SegmentedBar,
  Timeline,
  Trace,
  Tree,
} from "./figures";
import { Sections, Steps, Todos } from "./lists";
import {
  Badge,
  Callout,
  Caption,
  Code,
  Entity,
  File,
  Icon,
  Image,
  KeyValue,
  List,
  Metric,
  Sources,
  Text,
  Title,
} from "./content";
import { Board, Decision, Estimate, Plan, Roadmap, Status } from "./manage";
import { Flashcards, Quiz, Timer, Walkthrough } from "./widgets";

/** What the prompt teaches, in the order it teaches it. */
export const programDefinitions = [
  Screen,
  Header,
  Stack,
  Row,
  Grid,
  Card,
  Divider,
  Spacer,
  Tabs,
  Details,
  Carousel,
  StatusLine,
  Title,
  Text,
  Caption,
  Badge,
  Callout,
  KeyValue,
  Code,
  Icon,
  Image,
  File,
  Sources,
  List,
  Entity,
  Metric,
  Table,
  Chart,
  Sparkline,
  Progress,
  Gauge,
  Bar,
  Tree,
  Timeline,
  CalendarHeatmap,
  SegmentedBar,
  Trace,
  Snippet,
  Diff,
  Steps,
  Sections,
  Todos,
  Button,
  Form,
  Toggle,
  Choice,
  Radio,
  Select,
  Checklist,
  Rating,
  Slider,
  Input,
  TextArea,
  Stepper,
  ListEditor,
  DateInput,
  OptionCards,
  Swatches,
  EditableTable,
  FollowUps,
  Timer,
  Quiz,
  Flashcards,
  Walkthrough,
  Board,
  Roadmap,
  Status,
  Plan,
  Decision,
  Estimate,
];

/**
 * The names mu retired, kept for the programs that wrote them.
 *
 * They are in the library the parser is built from, so an older block still
 * paints, and not in `programGroups`, so `openui-library` and the prompt never
 * offer them. `openui-library` prints them only when a program's own diagnostic
 * names one.
 */
const legacyDefinitions = retiredDefinitions;

/** Everything the parser accepts: what is taught, and what is only still drawn. */
export const allProgramDefinitions = [
  ...programDefinitions,
  ...legacyDefinitions,
];

/**
 * What each name in the library draws with — read off the definitions, so a
 * component can be in the library and not have a drawer only by a type error.
 */
export const programDrawers: Record<string, ProgramDrawer> = Object.fromEntries(
  allProgramDefinitions.map((definition) => [
    definition.name,
    definition.component,
  ]),
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
 * The field remains because `OpenUIGroupInfo` and `openui-library` print it. A
 * note worth keeping is one a drawer actually implements — and then it belongs
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
    components: [
      "Stack",
      "Row",
      "Grid",
      "Card",
      "Divider",
      "Spacer",
      "Tabs",
      "Details",
      "Carousel",
    ],
    notes: [],
  },
  {
    name: "Content",
    components: [
      "Title",
      "Text",
      "Caption",
      "Badge",
      "Callout",
      "KeyValue",
      "Code",
      "Icon",
      "Image",
      "File",
      "Sources",
      "List",
      "Entity",
      "Metric",
    ],
    notes: [],
  },
  {
    name: "Data",
    components: [
      "Table",
      "Chart",
      "Sparkline",
      "Progress",
      "Gauge",
      "Bar",
      "Tree",
      "Timeline",
      "CalendarHeatmap",
      "SegmentedBar",
      "Trace",
      "Snippet",
      "Diff",
      "Steps",
      "Sections",
      "Todos",
    ],
    notes: [],
  },
  {
    name: "Inputs",
    components: [
      "Button",
      "Form",
      "Toggle",
      "Choice",
      "Radio",
      "Select",
      "Checklist",
      "Rating",
      "Slider",
      "Input",
      "TextArea",
      "Stepper",
      "ListEditor",
      "DateInput",
      "OptionCards",
      "Swatches",
      "EditableTable",
      "FollowUps",
    ],
    notes: [],
  },
  {
    name: "Widgets",
    components: ["Timer", "Quiz", "Flashcards", "Walkthrough"],
    notes: [],
  },
  {
    name: "Manage",
    components: ["Board", "Roadmap", "Status", "Plan", "Decision", "Estimate"],
    notes: [],
  },
];
