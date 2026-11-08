/**
 * Folding a tool's `details` into the one shape the log paints from.
 *
 * Eleven tools answer with eleven details shapes; the row painter reaches a
 * single `OpenUIToolView`, so a details change moves this file and nothing in
 * the components. The view also decides the one thing only the store can say:
 * whether this call is the row its program is painted from.
 */

import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
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
  OpenUIDiagnostic,
  OpenUIEventsDetails,
  OpenUIFixturesDetails,
  OpenUILibraryDetails,
  OpenUIListDetails,
  OpenUIProgramDetails,
  OpenUIProgramInfo,
  OpenUIPromptDetails,
  OpenUISwitchDetails,
  OpenUIValueRow,
  OpenUIStateDetails,
  OpenUIToolStatus,
  OpenUIToolView,
  OpenUIValidateDetails,
} from "../types";
import { programStore } from "./programStore/store";
import { clipText, partsLine } from "../../core/lib/agent/toolText";

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

const has = (details: unknown, key: string): boolean =>
  typeof details === "object" &&
  details !== null &&
  key in (details as Record<string, unknown>);

const as = <T>(details: unknown): T => details as T;

/** One array field of a details shape, or nothing when that tool has none. */
const fieldOf = <T>(details: unknown, key: string): T[] => {
  const value = (details as Record<string, unknown>)[key];
  return Array.isArray(value) ? (value as T[]) : [];
};

/** One number field of a details shape. */
const numberOf = (details: unknown, key: string, fallback: number): number => {
  const value = (details as Record<string, unknown>)[key];
  return typeof value === "number" ? value : fallback;
};

/** One boolean field of a details shape. */
const flagOf = (details: unknown, key: string): boolean =>
  (details as Record<string, unknown>)[key] === true;

const countOf = (value: number, one: string): string =>
  `${String(value)} ${value === 1 ? one : `${one}s`}`;

/** Each tool's own sentence for what its answer holds. One per tool, so a
 * details change moves one line and the fold stays a lookup.
 */
type Headline = (details: unknown) => string;

const promptHeadline: Headline = (details) =>
  `${String(as<OpenUIPromptDetails>(details).chars)} chars of reference`;

const libraryHeadline: Headline = (details) => {
  const view = as<OpenUILibraryDetails>(details);
  return view.name === ""
    ? `${countOf(view.count, "component")} in ${countOf(view.groups.length, "group")}`
    : `${view.name} · ${countOf(view.components[0]?.props.length ?? 0, "arg")}`;
};

const validateHeadline: Headline = (details) => {
  const view = as<OpenUIValidateDetails>(details);
  return partsLine(
    countOf(view.statements, "statement"),
    countOf(view.components.length, "component"),
    view.diagnostics.length === 0 ? "" : `${String(view.diagnostics.length)} errors`,
  );
};

const eventsHeadline: Headline = (details) =>
  countOf(as<OpenUIEventsDetails>(details).events.length, "interaction");

const fixturesHeadline: Headline = (details) => {
  const names = as<OpenUIFixturesDetails>(details).names;
  return names.length === 0 ? "cleared" : countOf(names.length, "name");
};

const programsHeadline: Headline = (details) =>
  countOf(as<OpenUIListDetails>(details).programs.length, "program");

const clearHeadline: Headline = (details) =>
  countOf(as<OpenUIClearDetails>(details).removed, "program");

const writeHeadline: Headline = (details) => {
  const view = as<OpenUIProgramDetails>(details);
  return partsLine(
    `${String(view.chars)} chars`,
    countOf(view.statements, "statement"),
    view.components === 0 ? "" : `${String(view.components)} drawn`,
    view.diagnostics.length === 0 ? "" : `${String(view.diagnostics.length)} errors`,
  );
};

const stateHeadline: Headline = (details) => {
  const view = as<OpenUIStateDetails>(details);
  return partsLine(
    countOf(view.statements, "statement"),
    countOf(view.drawn.length, "component"),
    view.errors.length === 0 ? "" : `${String(view.errors.length)} errors`,
    view.waiting === 0 ? "" : `${String(view.waiting)} waiting`,
  );
};

const HEADLINES: Readonly<Record<string, Headline>> = {
  [OPENUI_PROMPT_TOOL]: promptHeadline,
  [OPENUI_LIBRARY_TOOL]: libraryHeadline,
  [OPENUI_VALIDATE_TOOL]: validateHeadline,
  [OPENUI_EVENTS_TOOL]: eventsHeadline,
  [OPENUI_TOOLS_TOOL]: fixturesHeadline,
  [OPENUI_LIST_TOOL]: programsHeadline,
  [OPENUI_SWITCH_TOOL]: programsHeadline,
  [OPENUI_CLEAR_TOOL]: clearHeadline,
  [OPENUI_RENDER_TOOL]: writeHeadline,
  [OPENUI_STREAM_TOOL]: writeHeadline,
  [OPENUI_STATE_TOOL]: stateHeadline,
};

/** The one-line summary a details shape carries, in the tool's own words. */
function headlineOf(tool: string, details: unknown): string {
  const words = HEADLINES[tool];
  return words === undefined ? "" : words(details);
}

/** The identity chips a row opens with: the program, the source, the scope. */
function cellsOf(tool: string, details: unknown): OpenUIToolView["cells"] {
  if (has(details, "name")) {
    const view = as<{ name?: string }>(details);
    const name = view.name ?? "";
    if (tool === OPENUI_VALIDATE_TOOL)
      return [{ label: "program", value: "(not in the log)" }];
    return [{ label: "program", value: name === "" ? "(showing)" : name }];
  }
  return [];
}

/** The folded view of one OpenUI tool call, or null when its answer is not one. */
export function openUIToolViewOf(
  item: ToolTranscriptItem,
): OpenUIToolView | null {
  const tool = item.name.toLowerCase();
  const details = item.details;
  if (details === undefined || details === null || !has(details, "status"))
    return null;

  const status = (details as { status: OpenUIToolStatus }).status;
  const name = has(details, "name")
    ? String((details as { name?: unknown }).name ?? "")
    : String(item.args?.name ?? "");

  const read = sectionsOf(tool, details);

  return {
    ...EMPTY,
    tool,
    status,
    ok: has(details, "ok") ? (details as { ok?: boolean }).ok !== false : true,
    name,
    headline: clipText(headlineOf(tool, details), 96),
    cells: cellsOf(tool, details),
    programs: fieldOf<OpenUIProgramInfo>(details, "programs"),
    components: read.components,
    diagnostics: read.diagnostics,
    events: fieldOf(details, "events"),
    values: read.values,
    drawn: read.drawn,
    names: fieldOf(details, "names"),
    omitted: numberOf(details, "omitted", 0),
    streaming: flagOf(details, "streaming"),
    live: flagOf(details, "live"),
    waiting: numberOf(details, "waiting", 0),
    drawnProgram: drawnFrom(tool, item, name),
  };
}

/** The four sections a tool's answer fills, per tool rather than per field. */
function sectionsOf(tool: string, details: unknown): {
  components: OpenUILibraryDetails["components"];
  diagnostics: OpenUIDiagnostic[];
  values: OpenUIValueRow[];
  drawn: string[];
} {
  if (tool === OPENUI_LIBRARY_TOOL)
    return {
      components: as<OpenUILibraryDetails>(details).components,
      diagnostics: [],
      values: [],
      drawn: [],
    };
  if (tool === OPENUI_VALIDATE_TOOL)
    return {
      components: [],
      diagnostics: as<OpenUIValidateDetails>(details).diagnostics,
      values: [],
      drawn: [],
    };
  if (tool === OPENUI_STATE_TOOL) {
    const view = as<OpenUIStateDetails>(details);
    return {
      components: [],
      diagnostics: view.errors,
      values: view.values,
      drawn: view.drawn,
    };
  }
  return {
    components: [],
    diagnostics: fieldOf(details, "diagnostics"),
    values: [],
    drawn: [],
  };
}

/** Whether this call is the row its program is painted from. */
function drawnFrom(tool: string, item: ToolTranscriptItem, name: string): boolean {
  if (tool !== OPENUI_RENDER_TOOL && tool !== OPENUI_STREAM_TOOL) return false;
  if (name === "") return false;
  return programStore.get(name)?.anchor === item.toolCallId;
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
