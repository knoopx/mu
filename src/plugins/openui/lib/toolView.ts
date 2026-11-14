/**
 * Folding a tool's `details` into the one shape the log paints from.
 *
 * Eleven tools answer with eleven details shapes; the row painter reaches a
 * single `OpenUIToolView`, so a details change moves this file and nothing in
 * the components. The fold is per tool, and each fold takes the details
 * interface its own tool answers with: the field *names* are the typechecker's
 * business, and only the coercion of a field stays at runtime, because the
 * details of a session resumed this week are JSON rather than the object the
 * tool returned. A fold used to probe one shared bag of keys by name —
 * `has(details, "streaming")`, `numberOf(details, "omitted", 0)` — which meant a
 * renamed field was a row that quietly lost a figure rather than a build that
 * said so.
 *
 * The view also decides the one thing only the store can say: whether this call
 * is the row its program is painted from.
 */

import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import {
  detailsAs,
  detailFlag,
  detailList,
  detailNumber,
  detailText,
  detailWord,
} from "../../core/lib/agent/toolDetails";
import { clipText, partsLine } from "../../core/lib/agent/toolText";
import {
  OPENUI_CLEAR_TOOL,
  OPENUI_EVENTS_TOOL,
  OPENUI_LIBRARY_TOOL,
  OPENUI_LIST_TOOL,
  OPENUI_PROMPT_TOOL,
  OPENUI_RENDER_TOOL,
  OPENUI_STATE_TOOL,
  OPENUI_STREAM_TOOL,
  OPENUI_SWITCH_TOOL,
  OPENUI_TOOLS_TOOL,
  OPENUI_VALIDATE_TOOL,
} from "../constants";
import type {
  OpenUIClearDetails,
  OpenUIComponentInfo,
  OpenUIDiagnostic,
  OpenUIEventRecord,
  OpenUIEventsDetails,
  OpenUIFixturesDetails,
  OpenUILibraryDetails,
  OpenUIListDetails,
  OpenUIProgramDetails,
  OpenUIProgramInfo,
  OpenUIPromptDetails,
  OpenUIStateDetails,
  OpenUISwitchDetails,
  OpenUIToolStatus,
  OpenUIToolView,
  OpenUIValidateDetails,
  OpenUIValueRow,
} from "../types";
import { programStore } from "./programStore/store";

const EMPTY: OpenUIToolView = {
  tool: "",
  status: "ok",
  ok: true,
  name: "",
  headline: "",
  cells: [],
  programs: [],
  components: [],
  diagnostics: [],
  events: [],
  values: [],
  drawn: [],
  names: [],
  omitted: 0,
  streaming: false,
  live: false,
  waiting: 0,
  drawnProgram: false,
};

/** The status vocabulary the eleven tools answer in. */
const STATUSES = [
  "ok",
  "failed",
  "empty",
  "unknown",
  "open",
] as const satisfies readonly OpenUIToolStatus[];

/** A fold in the shape the table holds it: the answer arrives as JSON. */
type ErasedFold = (
  details: unknown,
  item: ToolTranscriptItem,
) => OpenUIToolView | null;

/** Every OpenUI answer names its status before it names anything else. */
interface OpenUIAnswer {
  status: OpenUIToolStatus;
}

/**
 * One tool's fold, read from its own details shape. This is the single place an
 * OpenUI answer stops being `unknown`: the field names are then the tool's own
 * interface's, and every value is still read through a reader.
 */
const foldOf =
  <D extends OpenUIAnswer>(
    fold: (details: D, item: ToolTranscriptItem) => OpenUIToolView,
  ): ErasedFold =>
  (details, item) => {
    const answer = detailsAs<D>(details);
    // An answer that does not even name a status is not one of this plugin's
    // eleven, so the row falls back to the tool's own text rather than painting
    // an empty program.
    if (answer === null || detailWord(answer.status, STATUSES) === null)
      return null;
    return fold(answer, item);
  };

const countOf = (value: number, one: string): string =>
  `${String(value)} ${value === 1 ? one : `${one}s`}`;

/** The tool's own status, overridden when the call itself failed. */
const statusOf = (
  details: { status: OpenUIToolStatus },
  item: ToolTranscriptItem,
): OpenUIToolStatus =>
  item.status === "error"
    ? "failed"
    : (detailWord(details.status, STATUSES) ?? "unknown");

/**
 * Which program the answer is about: what the tool answered with, or, for the
 * tools that answer about a program without repeating its name, what it was
 * asked for.
 */
const nameOf = (named: string | undefined, item: ToolTranscriptItem): string =>
  detailText(named, detailText(item.args?.name));

/** The one chip a row opens with: the program the answer holds. */
const programCells = (tool: string, name: string): OpenUIToolView["cells"] => [
  {
    label: "program",
    value:
      tool === OPENUI_VALIDATE_TOOL
        ? "(not in the log)"
        : name === ""
          ? "(showing)"
          : name,
  },
];

/** The part of the view every fold starts from. */
const head = (
  item: ToolTranscriptItem,
  details: { status: OpenUIToolStatus },
  name: string,
): OpenUIToolView => ({
  ...EMPTY,
  tool: item.name.toLowerCase(),
  status: statusOf(details, item),
  name,
  headline: "",
  cells: [],
});

// ── the eleven folds ─────────────────────────────────────────────────────────

const promptFold = (
  details: OpenUIPromptDetails,
  item: ToolTranscriptItem,
): OpenUIToolView => ({
  ...head(item, details, nameOf(undefined, item)),
  headline: `${String(detailNumber(details.chars))} chars of reference`,
});

const libraryFold = (
  details: OpenUILibraryDetails,
  item: ToolTranscriptItem,
): OpenUIToolView => {
  const name = detailText(details.name);
  const components = detailList<OpenUIComponentInfo>(details.components);
  return {
    ...head(item, details, name),
    headline:
      name === ""
        ? `${countOf(detailNumber(details.count), "component")} in ${countOf(
            detailList(details.groups).length,
            "group",
          )}`
        : `${name} · ${countOf(components[0]?.props.length ?? 0, "arg")}`,
    cells: programCells(item.name.toLowerCase(), name),
    components,
    omitted: detailNumber(details.omitted),
  };
};

const validateFold = (
  details: OpenUIValidateDetails,
  item: ToolTranscriptItem,
): OpenUIToolView => {
  const name = detailText(details.name);
  const diagnostics = detailList<OpenUIDiagnostic>(details.diagnostics);
  return {
    ...head(item, details, name),
    ok: detailFlag(details.ok, true),
    headline: partsLine(
      countOf(detailNumber(details.statements), "statement"),
      countOf(detailList(details.components).length, "component"),
      diagnostics.length === 0 ? "" : `${String(diagnostics.length)} errors`,
    ),
    cells: programCells(item.name.toLowerCase(), name),
    diagnostics,
  };
};

const eventsFold = (
  details: OpenUIEventsDetails,
  item: ToolTranscriptItem,
): OpenUIToolView => ({
  ...head(item, details, nameOf(details.name, item)),
  headline: countOf(detailList(details.events).length, "interaction"),
  cells: programCells(item.name.toLowerCase(), detailText(details.name)),
  events: detailList<OpenUIEventRecord>(details.events),
  omitted: detailNumber(details.omitted),
  waiting: detailNumber(details.waiting),
});

const fixturesFold = (
  details: OpenUIFixturesDetails,
  item: ToolTranscriptItem,
): OpenUIToolView => {
  const names = detailList<string>(details.names);
  return {
    ...head(item, details, nameOf(undefined, item)),
    headline: names.length === 0 ? "cleared" : countOf(names.length, "name"),
    names,
  };
};

const listFold = (
  details: OpenUIListDetails,
  item: ToolTranscriptItem,
): OpenUIToolView => {
  const programs = detailList<OpenUIProgramInfo>(details.programs);
  return {
    ...head(item, details, nameOf(undefined, item)),
    headline: countOf(programs.length, "program"),
    programs,
  };
};

const switchFold = (
  details: OpenUISwitchDetails,
  item: ToolTranscriptItem,
): OpenUIToolView => {
  const name = detailText(details.name);
  const programs = detailList<OpenUIProgramInfo>(details.programs);
  return {
    ...head(item, details, name),
    headline: countOf(programs.length, "program"),
    cells: programCells(item.name.toLowerCase(), name),
    programs,
  };
};

const clearFold = (
  details: OpenUIClearDetails,
  item: ToolTranscriptItem,
): OpenUIToolView => ({
  ...head(item, details, nameOf(undefined, item)),
  headline: countOf(detailNumber(details.removed), "program"),
  names: detailList<string>(details.names),
});

/** Whether this call is the row its program is painted from. */
const drawnFrom = (item: ToolTranscriptItem, name: string): boolean =>
  name !== "" && (programStore.get(name)?.anchor === item.toolCallId);

/** `openui-render` and `openui-stream` answer the same way, one program each. */
const writeFold = (
  details: OpenUIProgramDetails,
  item: ToolTranscriptItem,
): OpenUIToolView => {
  const name = detailText(details.name);
  const diagnostics = detailList<OpenUIDiagnostic>(details.diagnostics);
  return {
    ...head(item, details, name),
    ok: detailFlag(details.ok, true),
    headline: clipText(
      partsLine(
        `${String(detailNumber(details.chars))} chars`,
        countOf(detailNumber(details.statements), "statement"),
        detailNumber(details.components) === 0
          ? ""
          : `${String(detailNumber(details.components))} drawn`,
        diagnostics.length === 0 ? "" : `${String(diagnostics.length)} errors`,
      ),
      96,
    ),
    cells: programCells(item.name.toLowerCase(), name),
    diagnostics,
    streaming: detailFlag(details.streaming, false),
    live: detailFlag(details.live, false),
    waiting: detailNumber(details.waiting),
    drawnProgram: drawnFrom(item, name),
  };
};

const stateFold = (
  details: OpenUIStateDetails,
  item: ToolTranscriptItem,
): OpenUIToolView => {
  const name = detailText(details.name);
  const errors = detailList<OpenUIDiagnostic>(details.errors);
  const drawn = detailList<string>(details.drawn);
  return {
    ...head(item, details, name),
    headline: partsLine(
      countOf(detailNumber(details.statements), "statement"),
      countOf(drawn.length, "component"),
      errors.length === 0 ? "" : `${String(errors.length)} errors`,
      detailNumber(details.waiting) === 0
        ? ""
        : `${String(detailNumber(details.waiting))} waiting`,
    ),
    cells: programCells(item.name.toLowerCase(), name),
    diagnostics: errors,
    values: detailList<OpenUIValueRow>(details.values),
    drawn,
    streaming: detailFlag(details.streaming, false),
    live: detailFlag(details.live, false),
    waiting: detailNumber(details.waiting),
  };
};

/**
 * The eleven tools by the name they answer under. A tool missing here has no
 * view, and the log falls back to the tool's own `content` text.
 */
const FOLD_OF_TOOL: Readonly<Record<string, ErasedFold>> = {
  [OPENUI_PROMPT_TOOL]: foldOf(promptFold),
  [OPENUI_LIBRARY_TOOL]: foldOf(libraryFold),
  [OPENUI_VALIDATE_TOOL]: foldOf(validateFold),
  [OPENUI_EVENTS_TOOL]: foldOf(eventsFold),
  [OPENUI_TOOLS_TOOL]: foldOf(fixturesFold),
  [OPENUI_LIST_TOOL]: foldOf(listFold),
  [OPENUI_SWITCH_TOOL]: foldOf(switchFold),
  [OPENUI_CLEAR_TOOL]: foldOf(clearFold),
  [OPENUI_RENDER_TOOL]: foldOf(writeFold),
  [OPENUI_STREAM_TOOL]: foldOf(writeFold),
  [OPENUI_STATE_TOOL]: foldOf(stateFold),
};

/** The folded view of one OpenUI tool call, or null when its answer is not one. */
export function openUIToolViewOf(
  item: ToolTranscriptItem,
): OpenUIToolView | null {
  const fold = FOLD_OF_TOOL[item.name.toLowerCase()];
  if (fold === undefined) return null;
  const view = fold(item.details, item);
  // The sentence a row trails is bounded here, once, whatever tool wrote it.
  return view === null ? null : { ...view, headline: clipText(view.headline, 96) };
}

/** The words a tool's empty answer reads as. */
export const openUIEmptyWords: Readonly<Record<string, string>> = {
  [OPENUI_LIST_TOOL]: "the log holds no program",
  [OPENUI_EVENTS_TOOL]: "nobody has used the screen yet",
  [OPENUI_STATE_TOOL]: "no program is showing",
  [OPENUI_TOOLS_TOOL]: "no data is served to any program",
  [OPENUI_LIBRARY_TOOL]: "the library is empty",
  [OPENUI_SWITCH_TOOL]: "no program to show",
  [OPENUI_CLEAR_TOOL]: "nothing to take out of the log",
};

/** What each tool is doing while it runs. */
export const openUIRunningWords: Readonly<Record<string, string>> = {
  [OPENUI_PROMPT_TOOL]: "writing the language reference",
  [OPENUI_LIBRARY_TOOL]: "reading the component library",
  [OPENUI_VALIDATE_TOOL]: "parsing the program",
  [OPENUI_RENDER_TOOL]: "drawing the program",
  [OPENUI_STREAM_TOOL]: "streaming the program",
  [OPENUI_STATE_TOOL]: "reading what the screen holds",
  [OPENUI_EVENTS_TOOL]: "reading what the human did",
  [OPENUI_TOOLS_TOOL]: "serving the program's data",
  [OPENUI_LIST_TOOL]: "counting the programs",
  [OPENUI_SWITCH_TOOL]: "showing a program",
  [OPENUI_CLEAR_TOOL]: "taking programs out of the log",
};
