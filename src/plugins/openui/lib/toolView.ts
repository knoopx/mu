/**
 * Turns a openui answer into what the transcript draws.
 *
 * A openui tool answers twice: aligned columns for the model, and `details`
 * for the log. This file folds the details into one `OpenuiToolView` — the
 * chips of what the call touched, the line of what it left in the log, and
 * rows in the shape the shared row painter already knows — so the component
 * never parses a report and never learns a tool's name.
 *
 * It is also where a row learns whether it is the live one: a program is drawn
 * by the newest call that rendered it, and every older row for that name says so
 * instead of drawing a second copy.
 */

import {
  listOf,
  numberOf,
  recordOf,
  stringsOf,
  textOf,
  type JsonRecord,
} from "../../code-quality/lib/json";
import { counted, partsLine } from "../../core/lib/agent/toolText";
import type {
  ToolRowCell,
  ToolRowTone,
  ToolPaintRow,
} from "../../core/lib/ui/toolRowPaint";
import {
  MAX_DIAGNOSTIC_ROWS,
  OPENUI_CLEAR_TOOL,
  OPENUI_EVENTS_TOOL,
  OPENUI_LIBRARY_TOOL,
  OPENUI_LIST_TOOL,
  OPENUI_PROMPT_TOOL,
  OPENUI_RENDER_TOOL,
  OPENUI_STATE_TOOL,
  OPENUI_STREAM_TOOL,
  OPENUI_TOOLS_TOOL,
  OPENUI_SWITCH_TOOL,
  OPENUI_VALIDATE_TOOL,
  OPENUI_WRITE_TOOLS,
} from "../constants";
import { programStore } from "./programStore";
import { clock, clipValue } from "./format";
import type {
  OpenuiDiagnostic,
  OpenuiEvent,
  OpenuiLibraryComponent,
  OpenuiProgramRow,
  OpenuiPropRow,
  OpenuiSection,
  OpenuiToolStatus,
  OpenuiToolView,
} from "../types";

const STATUSES: readonly OpenuiToolStatus[] = [
  "ok",
  "invalid",
  "empty",
  "unknown-program",
  "no-program",
  "failed",
];

type Args = JsonRecord;
type Details = JsonRecord;

interface FoldInput {
  tool: string;
  args: Args;
  details: Details;
  itemStatus: string;
  toolCallId: string;
}

type Fold = (input: FoldInput) => OpenuiToolView;

const FOLD_OF_TOOL: ReadonlyMap<string, Fold> = new Map([
  [OPENUI_VALIDATE_TOOL, reportView],
  [OPENUI_RENDER_TOOL, reportView],
  [OPENUI_STREAM_TOOL, reportView],
  [OPENUI_STATE_TOOL, stateView],
  [OPENUI_EVENTS_TOOL, eventsView],
  [OPENUI_LIST_TOOL, listView],
  [OPENUI_LIBRARY_TOOL, libraryView],
  [OPENUI_PROMPT_TOOL, promptView],
  [OPENUI_TOOLS_TOOL, fixturesView],
  [OPENUI_SWITCH_TOOL, logView],
  [OPENUI_CLEAR_TOOL, logView],
]);

export function openuiToolViewOf(item: {
  name: string;
  args?: Record<string, unknown>;
  details?: unknown;
  status: string;
  toolCallId: string;
}): OpenuiToolView | null {
  const fold = FOLD_OF_TOOL.get(item.name.toLowerCase());
  if (fold === undefined) return null;

  const details = recordOf(item.details);
  if (details === null || typeof details["status"] !== "string") return null;

  return fold({
    tool: item.name.toLowerCase(),
    args: recordOf(item.args) ?? {},
    details,
    itemStatus: item.status,
    toolCallId: item.toolCallId,
  });
}

function statusOf(details: Details, itemStatus: string): OpenuiToolStatus {
  if (itemStatus === "error") return "failed";
  const stated = textOf(details, "status");
  return STATUSES.includes(stated as OpenuiToolStatus)
    ? (stated as OpenuiToolStatus)
    : "ok";
}

function view(
  tool: string,
  details: Details,
  input: FoldInput,
): OpenuiToolView {
  const program = textOf(details, "program") || textOf(input.args, "name");
  return {
    tool,
    status: statusOf(details, input.itemStatus),
    program,
    live:
      program !== "" && programStore.isOwner(program, input.toolCallId),
    headline: "",
    cells: [],
    sections: [],
    note: "",
    hiddenErrors: 0,
  };
}

function cellsOf(
  ...pairs: readonly (readonly [string, string | number])[]
): ToolRowCell[] {
  return pairs
    .map(([label, value]) => ({ label, value: String(value) }))
    .filter((cell) => cell.value !== "" && cell.value !== "0");
}

function sectionsOf(title: string, rows: readonly ToolPaintRow[]): OpenuiSection[] {
  return rows.length === 0 ? [] : [{ title, rows }];
}

const diagnosticsOf = (value: unknown): OpenuiDiagnostic[] =>
  listOf(value).flatMap((entry) => {
    const record = recordOf(entry);
    if (record === null) return [];
    return [
      {
        code: textOf(record, "code"),
        message: textOf(record, "message"),
        ...(textOf(record, "hint") === "" ? {} : { hint: textOf(record, "hint") }),
        ...(record["severity"] === "warning" ? { severity: "warning" as const } : {}),
      },
    ];
  });

/** One diagnostic: the complaint, the move that clears it, and how loud it is. */
function diagnosticRow(error: OpenuiDiagnostic): ToolPaintRow {
  const warning = error.severity === "warning";
  return {
    key: warning ? "warn" : "error",
    primary: error.message,
    secondary: error.hint ?? "",
    badge: warning ? "warning" : error.code,
    tone: warning ? "warn" : "bad",
  };
}

/** The two chips every openui call states: which program it touched, and what is on show. */
function listingCells(details: Details): ToolRowCell[] {
  const programs = stringsOf(details["programs"]);
  const active = textOf(details, "active");
  return cellsOf(
    ["in the log", programs.join(", ")],
    ["showing", active],
  );
}

/** What a program answered for itself: how it parsed, and how big it is. */
const programCells = (details: Details): ToolRowCell[] =>
  cellsOf(
    ["statements", numberOf(details, "statements")],
    ["components", listOf(details["components"]).length],
    ["chars", numberOf(details, "chars")],
  );

const renderCell = (live: boolean): ToolRowCell[] =>
  live ? cellsOf(["painted", "here"]) : cellsOf(["painted", "by a later call"]);

/** openui-validate, openui-render and openui-stream all answer the same report. */
function reportView(input: FoldInput): OpenuiToolView {
  const v = view(input.tool, input.details, input);
  const errors = diagnosticsOf(input.details["errors"]);
  const drawn = errors.slice(0, MAX_DIAGNOSTIC_ROWS);
  const streaming = input.details["streaming"] === true;
  const incomplete = input.details["incomplete"] === true;
  const writes = OPENUI_WRITE_TOOLS.includes(input.tool);

  v.cells = [
    ...programCells(input.details),
    ...(writes ? renderCell(v.live) : []),
    ...listingCells(input.details),
  ];
  v.headline = partsLine(
    `${counted(numberOf(input.details, "statements"), "statement")} parsed`,
    streaming ? (incomplete ? "mid-statement, stream open" : "stream open") : "",
    errors.length === 0
      ? "no errors"
      : `${counted(errors.length, "error")} — the program renders with them`,
  );
  v.sections = sectionsOf("", drawn.map(diagnosticRow));
  v.hiddenErrors = errors.length - drawn.length;
  v.note =
    v.status === "invalid"
      ? "the program is in the log with these errors — fix them and re-send the same name"
      : streaming
        ? "the program is still streaming; send done: true to close it"
        : "";
  return v;
}

/** The `$variable` values a program holds, as the human left them. */
function stateRows(state: JsonRecord | null): ToolPaintRow[] {
  if (state === null) return [];
  return Object.entries(state).map(([name, value]) => ({
    key: name.startsWith("$") ? name : `$${name}`,
    primary: clipValue(value),
    secondary: "",
    badge: "",
    tone: "neutral",
  }));
}

function stateView(input: FoldInput): OpenuiToolView {
  const v = view(OPENUI_STATE_TOOL, input.details, input);
  const runtime = recordOf(input.details["runtime"]);
  const errors = diagnosticsOf(runtime?.["errors"]);
  const queryErrors = stringsOf(runtime?.["queryErrors"]);
  const state = recordOf(input.details["state"]);

  v.cells = [
    ...cellsOf(
      ["chars", numberOf(input.details, "chars")],
      ["statements", numberOf(runtime, "statements")],
      ["components", listOf(runtime?.["components"]).length],
      ["unread events", numberOf(runtime, "unread")],
    ),
    ...listingCells(input.details),
  ];
  v.headline =
    Object.keys(state ?? {}).length === 0
      ? "no state bound yet"
      : counted(Object.keys(state ?? {}).length, "bound value");
  v.sections = [
    ...sectionsOf("$ state", stateRows(state)),
    ...sectionsOf(
      "query failures",
      queryErrors.map((message) => ({
        key: "query",
        primary: message,
        secondary: "",
        badge: "query",
        tone: "warn",
      })),
    ),
    ...sectionsOf("render diagnostics", errors.map(diagnosticRow)),
  ];
  v.note = v.live ? "" : "this program is not the one the log paints";
  return v;
}

/** One thing the human did in the rendered program. */
function eventRow(event: OpenuiEvent): ToolPaintRow {
  const form = recordOf(event.formState);
  const params = recordOf(event.params);
  return {
    key: clock(event.at),
    primary: event.message,
    secondary: partsLine(
      event.formName === undefined ? "" : `form ${event.formName}`,
      form === null ? "" : `${String(Object.keys(form).length)} field values`,
      params === null ? "" : Object.keys(params).join(", "),
    ),
    badge: event.type,
    tone: "neutral",
    members: form === null ? undefined : Object.entries(form).map(([name, value]) => `${name} = ${clipValue(value)}`),
  };
}

function eventsView(input: FoldInput): OpenuiToolView {
  const v = view(OPENUI_EVENTS_TOOL, input.details, input);
  const events = listOf(input.details["events"]).flatMap((entry) => {
    const record = recordOf(entry);
    if (record === null) return [];
    return [
      {
        at: numberOf(record, "at"),
        type: textOf(record, "type"),
        message: textOf(record, "message"),
        params: recordOf(record["params"]) ?? undefined,
        formState: recordOf(record["formState"]) ?? undefined,
        formName: textOf(record, "formName") || undefined,
      },
    ];
  });

  v.cells = cellsOf(
    ["program", v.program],
    ["cleared", input.details["cleared"] === true ? "yes" : "no"],
  );
  v.headline = counted(events.length, "interaction");
  v.sections = sectionsOf("", events.map(eventRow));
  v.note =
    events.length === 0
      ? "the human has not clicked, typed or submitted anything in this program"
      : "";
  return v;
}

function listView(input: FoldInput): OpenuiToolView {
  const v = view(OPENUI_LIST_TOOL, input.details, input);
  const programs = listOf(input.details["programs"]).flatMap((entry): OpenuiProgramRow[] => {
    const record = recordOf(entry);
    if (record === null) return [];
    return [
      {
        name: textOf(record, "name"),
        chars: numberOf(record, "chars"),
        streaming: record["streaming"] === true,
        statements: numberOf(record, "statements"),
        errors: numberOf(record, "errors"),
        unread: numberOf(record, "unread"),
        updatedAt: numberOf(record, "updatedAt"),
      },
    ];
  });

  v.cells = cellsOf(
    ["showing", textOf(input.details, "active")],
    ["fixtures", stringsOf(input.details["fixtures"]).join(", ")],
  );
  v.headline = counted(programs.length, "program");
  v.sections = sectionsOf(
    "",
    programs.map((row) => ({
      key: row.name === textOf(input.details, "active") ? "shown" : "idle",
      primary: `${row.name} — ${counted(row.chars, "char")}`,
      secondary: partsLine(
        `${String(row.statements)} statements`,
        row.errors === 0 ? "" : `${String(row.errors)} errors`,
        row.unread === 0 ? "" : `${String(row.unread)} unread events`,
        row.streaming ? "streaming" : "",
      ),
      badge: row.streaming ? "streaming" : row.errors > 0 ? "error" : "",
      tone: (row.streaming || row.errors > 0 ? "warn" : "neutral") as ToolRowTone,
    })),
  );
  v.note = programs.length === 0 ? "nothing in the log yet" : "";
  return v;
}

/** One prop of a component: its name, the type it takes, and whether it is required. */
function propRow(prop: OpenuiPropRow): ToolPaintRow {
  return {
    key: prop.required ? "req" : "opt",
    primary: `${prop.name}: ${prop.type}`,
    secondary: prop.description,
    badge: prop.required ? "required" : "",
    tone: prop.required ? "accent" : "neutral",
  };
}

const GROUP_PREVIEW = 8;

function libraryView(input: FoldInput): OpenuiToolView {
  const v = view(OPENUI_LIBRARY_TOOL, input.details, input);
  const props = listOf(input.details["props"]).flatMap((entry): OpenuiPropRow[] => {
    const record = recordOf(entry);
    if (record === null) return [];
    return [
      {
        name: textOf(record, "name"),
        type: textOf(record, "type"),
        required: record["required"] === true,
        description: textOf(record, "description"),
      },
    ];
  });
  const components = listOf(input.details["components"]).flatMap(
    (entry): OpenuiLibraryComponent[] => {
      const record = recordOf(entry);
      if (record === null) return [];
      return [
        {
          name: textOf(record, "name"),
          description: textOf(record, "description"),
          group: textOf(record, "group"),
        },
      ];
    },
  );
  const groups = recordOf(input.details["groups"]);

  v.cells = cellsOf(
    ["component", v.program],
    ["group", textOf(input.details, "group")],
    ["root", textOf(input.details, "root")],
    ["components", numberOf(input.details, "componentCount")],
    ["groups", numberOf(input.details, "groupCount")],
  );
  v.headline =
    v.program === ""
      ? `${counted(numberOf(input.details, "componentCount"), "component")} in ${String(
          numberOf(input.details, "groupCount"),
        )} groups`
      : textOf(input.details, "description");

  const groupRows = Object.entries(groups ?? {}).map(([group, names]) => {
    const list = listOf(names);
    return {
      key: group,
      primary: `${String(list.length)} components`,
      secondary:
        list.slice(0, GROUP_PREVIEW).join(", ") +
        (list.length > GROUP_PREVIEW ? ` +${String(list.length - GROUP_PREVIEW)} more` : ""),
      badge: "",
      tone: "neutral" as ToolRowTone,
    };
  });

  v.sections = [
    ...sectionsOf("props", props.map(propRow)),
    ...sectionsOf(
      "library",
      components.map((entry) => ({
        key: entry.group,
        primary: entry.name,
        secondary: entry.description,
        badge: "",
        tone: "neutral",
      })),
    ),
    ...sectionsOf("groups", groupRows),
  ];
  v.note =
    v.status === "unknown-program"
      ? "no component of that name — ask openui-library without a name for the index"
      : stringsOf(input.details["groupNotes"]).join(" ");
  return v;
}

function promptView(input: FoldInput): OpenuiToolView {
  const v = view(OPENUI_PROMPT_TOOL, input.details, input);
  v.cells = cellsOf(
    ["components", numberOf(input.details, "components")],
    ["root", textOf(input.details, "root")],
    ["lines", numberOf(input.details, "lines")],
    ["chars", numberOf(input.details, "chars")],
    ["groups", stringsOf(input.details["groups"]).join(", ")],
  );
  v.headline = "the language reference, read before writing a program";
  v.note = input.details["edit_mode"] === true ? "edit mode: patch an existing program" : "";
  return v;
}

function fixturesView(input: FoldInput): OpenuiToolView {
  const v = view(OPENUI_TOOLS_TOOL, input.details, input);
  const fixtures = stringsOf(input.details["fixtures"]);

  v.headline =
    fixtures.length === 0
      ? "fixtures cleared — every Query() falls back to its default"
      : counted(fixtures.length, "fixture");
  v.sections = sectionsOf(
    "",
    fixtures.map((name) => ({
      key: "query",
      primary: `Query("${name}", args, default)`,
      secondary: "resolves to the JSON this call supplied",
      badge: "",
      tone: "neutral",
    })),
  );
  return v;
}

/** openui-switch and openui-clear answer with what the log holds. */
function logView(input: FoldInput): OpenuiToolView {
  const v = view(
    textOf(input.details, "cleared") === "" ? OPENUI_SWITCH_TOOL : OPENUI_CLEAR_TOOL,
    input.details,
    input,
  );
  const cleared = textOf(input.details, "cleared");
  const active = textOf(input.details, "active");

  v.cells = listingCells(input.details);
  v.headline =
    cleared === ""
      ? `showing ${active === "" ? "nothing" : active}`
      : cleared === "*"
        ? "every program removed"
        : `removed ${cleared}`;
  v.note =
    v.status === "unknown-program"
      ? "no program of that name in the log"
      : stringsOf(input.details["programs"]).length === 0
        ? "no program is rendered yet"
        : "";
  return v;
}

export function openuiCellOf(view: OpenuiToolView, label: string): string {
  return view.cells.find((cell) => cell.label === label)?.value ?? "";
}

export function openuiRowsOf(view: OpenuiToolView): ToolPaintRow[] {
  return view.sections.flatMap((section) => [...section.rows]);
}
