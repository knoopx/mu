/**
 * The component library an OpenUI program is written against.
 *
 * Everything the plugin knows about the language comes from this registry: the
 * parse validates against it, the system prompt is generated from it, the
 * `openui-library` tool reads its schemas, and the renderer draws from it. A
 * component that is not registered here cannot be drawn and cannot be named in
 * a prompt, so adding a binding to adwaita-gpuix means adding it here and
 * nowhere else.
 */

import { createLibrary, type ComponentGroup } from "@openuidev/react-lang";
import type { LibraryJSONSchema } from "@openuidev/lang-core";
import {
  Card,
  CardHeader,
  Divider,
  Grid,
  Row,
  Spacer,
  Stack,
  Tag,
} from "./layout";
import {
  Callout,
  Caption,
  CodeBlock,
  HeadingBlock,
  Image,
  Json,
  KeyValue,
  Link,
  Metric,
  Quote,
  Text,
  TextContent,
} from "./text";
import {
  BarChart,
  Chart,
  Col,
  LineChart,
  ListBlock,
  ListItem,
  Progress,
  Table,
} from "./data";
import {
  Button,
  Buttons,
  CheckBox,
  Form,
  Input,
  Label,
  Select,
  SwitchField,
  TextArea,
} from "./forms";
import { Box, Carousel, Flashcard, Popover, Pressable } from "./containers";
import {
  DatePicker,
  IconButton,
  RadioGroup,
  SegmentedControl,
  Slider,
} from "./widgets";
import {
  ActionRow,
  BoxedList,
  ButtonRow,
  ComboRow,
  EntryRow,
  ExpanderRow,
  RowList,
  SwitchRow,
} from "./lists";
import {
  HeaderBar,
  Kbd,
  KeyHint,
  Pagination,
  Sidebar,
  SidebarItem,
  SidebarLabel,
  StatusBar,
  Tabs,
  ViewSwitcher,
} from "./appshell";
import { Banner, Empty, StatusPage, Toast } from "./feedback";
import { svgComponents } from "./svg";
import { Celebration, Glyph, YouTube } from "./media";
import { MathBlock } from "./math";

const EXTRA_LAYOUT = ["Box", "Carousel", "Popover", "Pressable"];
const EXTRA_TEXT = ["Caption", "Quote", "Link"];
const EXTRA_INPUTS = [
  "IconButton",
  "SegmentedControl",
  "Slider",
  "RadioGroup",
  "DatePicker",
];
const PLAY = ["Flashcard", "Celebration"];
const MEDIA = ["Image", "Icon", "YouTube"];
const DRAWING = [
  "Svg",
  "G",
  "Circle",
  "Ellipse",
  "Rect",
  "Line",
  "Path",
  "Polyline",
  "Polygon",
  "SvgText",
];
const LAYOUT = [
  "Stack",
  "Row",
  "Grid",
  "Card",
  "CardHeader",
  "Divider",
  "Spacer",
  "Tag",
];
const TEXT = [
  "Heading",
  "Text",
  "TextContent",
  "CodeBlock",
  "KeyValue",
  "Metric",
  "Math",
  "Callout",
  "Image",
  "Json",
];
const DATA = [
  "Table",
  "Col",
  "ListBlock",
  "ListItem",
  "BarChart",
  "LineChart",
  "Chart",
  "Progress",
];
const FORMS = [
  "Form",
  "Label",
  "Input",
  "TextArea",
  "Select",
  "CheckBox",
  "SwitchField",
  "Button",
  "Buttons",
];
const LISTS = [
  "RowList",
  "BoxedList",
  "ActionRow",
  "EntryRow",
  "SwitchRow",
  "ComboRow",
  "ExpanderRow",
  "ButtonRow",
];
const APP = [
  "HeaderBar",
  "ViewSwitcher",
  "Sidebar",
  "SidebarItem",
  "SidebarLabel",
  "StatusBar",
  "Tabs",
  "Pagination",
  "StatusPage",
  "Empty",
  "Toast",
  "Banner",
  "Kbd",
  "KeyHint",
];

export const library = createLibrary({
  components: [
    Stack,
    Row,
    Grid,
    Card,
    CardHeader,
    Divider,
    Spacer,
    Tag,
    HeadingBlock,
    Text,
    TextContent,
    CodeBlock,
    KeyValue,
    Metric,
    MathBlock,
    Callout,
    Image,
    Json,
    Table,
    Col,
    ListBlock,
    ListItem,
    BarChart,
    LineChart,
    Chart,
    Progress,
    Form,
    Label,
    Input,
    TextArea,
    Select,
    CheckBox,
    SwitchField,
    Button,
    Buttons,
    RowList,
    BoxedList,
    ActionRow,
    EntryRow,
    SwitchRow,
    ComboRow,
    ExpanderRow,
    ButtonRow,
    HeaderBar,
    ViewSwitcher,
    Sidebar,
    SidebarItem,
    SidebarLabel,
    StatusBar,
    Tabs,
    Pagination,
    StatusPage,
    Empty,
    Toast,
    Banner,
    Kbd,
    KeyHint,
    Box,
    Carousel,
    Popover,
    Pressable,
    Flashcard,
    Glyph,
    YouTube,
    Celebration,
    Caption,
    Quote,
    Link,
    IconButton,
    SegmentedControl,
    Slider,
    RadioGroup,
    DatePicker,
    ...svgComponents,
  ],
  root: "Stack",
  componentGroups: [
    { name: "Layout", components: [...LAYOUT, ...EXTRA_LAYOUT] },
    { name: "Text", components: [...TEXT, ...EXTRA_TEXT] },
    { name: "Data", components: DATA },
    { name: "Forms", components: [...FORMS, ...EXTRA_INPUTS] },
    {
      name: "Lists",
      components: LISTS,
      notes: [
        "Data rows go in RowList, flush on the view surface: no panel, no separators, no zebra, no tile per row.",
        "BoxedList is the one sanctioned panel and it holds controls or one object's detail rows only — never a data list, never inside the Sidebar, never inside another panel.",
        "Every repeating row carries the action for that item (ActionRow with @ToAssistant, a switch, a combo, an expander). A row with no action is a printout.",
        "Rows are one continuous stack: container depth stays ≤ 1.",
      ],
    },
    {
      name: "App",
      components: APP,
      notes: [
        "A window is HeaderBar (one centred title, flat verbs, ViewSwitcher) → content → StatusBar (text, rail, key caps — no controls).",
        "The HeaderBar carries the verbs of the whole view: filter, sort, view switch, search, refresh. A filter is a flat header button opening a Popover of option rows — never a row of the Sidebar, never a panel above the list.",
        "Sidebar lists places and objects only: SidebarItem rows, tinted fill on the current one. No SwitchRow, ComboRow, EntryRow, Button, panel or BoxedList inside it.",
        "StatusPage, Empty, Toast and Banner are the empty, condition and acknowledgement states — bound to the state that caused them, replacing the content they describe.",
      ],
    },
    { name: "Play", components: PLAY },
    {
      name: "Media and data",
      components: [...MEDIA, ...DATA],
      notes: [
        "GPUI paints no map tiles, no video player and no HTML sandbox: YouTube renders the poster plus its URL, and Icon is a first-class inline child.",
      ],
    },
    {
      name: "Drawing",
      components: DRAWING,
      notes: [
        "Svg takes a viewBox and shapes; shapes take plain numbers, so state can move them.",
        "fill and stroke take a tone (default, muted, accent, success, warning, destructive) or a hex colour.",
      ],
    },
  ] satisfies ComponentGroup[],
});

let cachedSchema: LibraryJSONSchema | undefined;

/** The JSON Schema the parser validates a program against; built once. */
export function librarySchema(): LibraryJSONSchema {
  cachedSchema ??= library.toJSONSchema();
  return cachedSchema;
}

export interface PromptOptions {
  tools?: string[];
  preamble?: string;
  examples?: string[];
  editMode?: boolean;
}

/** The language reference for this library — syntax, every component, the action rules. */
export function systemPrompt(options?: PromptOptions): string {
  return library.prompt(options);
}

export interface ComponentEntry {
  name: string;
  description: string;
  group: string;
}

const groupOf = new Map<string, string>();
for (const group of library.componentGroups ?? []) {
  for (const name of group.components) groupOf.set(name, group.name);
}

export function componentIndex(): ComponentEntry[] {
  return Object.values(library.components).map((component) => ({
    name: component.name,
    description: component.description,
    group: groupOf.get(component.name) ?? "Ungrouped",
  }));
}

export const componentNames = (): string[] => Object.keys(library.components);

export const componentEntry = (name: string): ComponentEntry | undefined =>
  componentIndex().find((entry) => entry.name === name);

/** Component names by the group the prompt teaches them in. */
export function groupIndex(): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const entry of componentIndex())
    (groups[entry.group] ??= []).push(entry.name);
  return groups;
}

export const groupNotes = (group: string): string[] =>
  library.componentGroups?.find((entry) => entry.name === group)?.notes ?? [];
