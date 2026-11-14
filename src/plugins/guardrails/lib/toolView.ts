/**
 * Turns what a guardrails tool answered into what the transcript draws.
 *
 * Each tool answers two audiences: `content` text in aligned columns for the
 * model, and structured `details` for the log. This file folds the details into
 * one `GuardrailsToolView` — the scope and tallies the header states once, the
 * cells the call ran with, and the rows of its answer in the shape the shared
 * painter already knows — so the component never parses an answer, never counts
 * a set the header already counted, and never hand-rolls a column the list has
 * to measure for itself. The details of a session resumed this week are JSON
 * rather than the object the call returned, so every value here is read through
 * a reader that checks the shape instead of trusting it.
 */

import type { BadgeVariant } from "adwaita-gpuix";

import { firstLine } from "../../../utils/truncate";
import {
  detailFlag,
  detailList,
  detailNumber,
  detailStrings,
  detailText,
  detailWord,
} from "../../core/lib/agent/toolDetails";
import {
  counted,
  homeLabel,
  moreLine,
  partsLine,
} from "../../core/lib/agent/toolText";
import type {
  ToolPaintRow,
  ToolPaintSection,
  ToolRowCell,
} from "../../core/lib/ui/toolRowPaint";
import {
  GUARDRAILS_COVERAGE_TOOL,
  GUARDRAILS_FIXTURE_TOOL,
  GUARDRAILS_TEST_TOOL,
  MAX_COVERAGE_ROWS,
  MAX_FIXTURE_ROWS,
  MAX_TEST_ROWS,
} from "../constants";
import type {
  GuardrailCoverageRow,
  GuardrailEngineState,
  GuardrailFixtureOp,
  GuardrailsCallStatus,
  GuardrailsCoverageDetails,
  GuardrailsFixtureUpdateDetails,
  GuardrailsTestDetails,
} from "../types";

/** One fixture of a suite run, as the tool wrote it. */
type TestRow = GuardrailsTestDetails["rows"][number];

/** The call states the three tools answer in. */
const STATUSES = [
  "ok",
  "empty",
  "failed",
] as const satisfies readonly GuardrailsCallStatus[];

export interface GuardrailsToolView {
  tool: string;
  status: GuardrailsCallStatus;

  /** What the call was pointed at: the header's first words, never a chip. */
  scope: string;

  /** The call's tallies, trailed along that one header line. */
  headline: string;

  /** What the call ran with — one chip per figure, on the header. */
  cells: readonly ToolRowCell[];

  /** The answer's rows, grouped by suite when a run covered more than one. */
  sections: readonly ToolPaintSection[];

  /** How many rows the card would not draw, so the header says they exist. */
  omitted: number;

  /** Why a call refused, what an empty call means, or the caution it owes. */
  note: string;

  /** The suite a write landed in. No other guardrails answer has a path. */
  path: string;
}

/** The pill a row's state wears. A suite's verdicts are good news and bad news;
 *  a domain that has never fired is neither — it is unproven. */
export const GUARDRAILS_BADGE_VARIANTS: Readonly<Record<string, BadgeVariant>> =
  {
    pass: "success",
    fail: "destructive",
    never: "warning",
    failed: "destructive",
  };

const viewOf = (
  tool: string,
  status: GuardrailsCallStatus,
): GuardrailsToolView => ({
  tool,
  status,
  scope: "",
  headline: "",
  cells: [],
  sections: [],
  omitted: 0,
  note: "",
  path: "",
});

/** One chip per figure: a cell that joined three numbers was one wide chip the
 *  header's clip ate the tail of. A figure the call did not resolve is no chip. */
const cellsOf = (
  ...pairs: readonly (readonly [string, string | number])[]
): ToolRowCell[] =>
  pairs
    .map(([label, value]) => ({ label, value: String(value).trim() }))
    .filter((cell) => cell.value !== "" && cell.value !== "0");

const statusOf = (
  details: { status?: unknown },
  itemStatus: string,
): GuardrailsCallStatus =>
  itemStatus === "error"
    ? "failed"
    : (detailWord(details.status, STATUSES) ?? "ok");

const sectionOf = (
  title: string,
  rows: readonly ToolPaintRow[],
): ToolPaintSection[] => (rows.length === 0 ? [] : [{ title, rows }]);

const cap = <T>(
  rows: readonly T[],
  limit: number,
): { shown: T[]; omitted: number } => ({
  shown: rows.slice(0, limit),
  omitted: Math.max(0, rows.length - limit),
});

// ---------------------------------------------------------------- test

/**
 * One fixture of a run.
 *
 * The fixture's id is the row's name — it is what a reader edits a suite by — so
 * it leads the row and no key column repeats it. What the engine read rides
 * under it in mono, what the engine answered rides in the figure column every
 * row of this list shares, and the verdict is the pill. A failure adds the one
 * line saying why, under its own row.
 */
function testRow(row: TestRow): ToolPaintRow {
  const passed = detailText(row.status).toUpperCase() === "PASS";
  return {
    key: `${row.domain}/${row.id}`,
    primary: row.id,
    secondary: `${row.field}: ${firstLine(row.command)}`,
    // Whether the call was stopped or let through is the answer; whether that
    // answer is the one the fixture asked for is the pill, not a second figure.
    trailing: detailFlag(row.got, false) ? "blocked" : "released",
    badge: passed ? "pass" : "fail",
    tone: passed ? "neutral" : "bad",
    members: row.detail === "" ? undefined : [firstLine(row.detail)],
  };
}

/** A run over several suites says which is which with a head per group, because
 *  a page of ids from four domains cannot say where one suite ends. One suite
 *  needs none: the header already named it. */
function suiteSections(rows: readonly ToolPaintRow[]): ToolPaintSection[] {
  const groups: { title: string; rows: ToolPaintRow[] }[] = [];
  const index = new Map<string, ToolPaintRow[]>();
  for (const row of rows) {
    const domain = row.key.slice(0, row.key.indexOf("/"));
    const held = index.get(domain);
    if (held === undefined) {
      const opened = [row];
      index.set(domain, opened);
      groups.push({ title: domain, rows: opened });
    } else held.push(row);
  }
  return groups.length <= 1 ? sectionOf("", rows) : groups;
}

function testView(
  details: GuardrailsTestDetails,
  itemStatus: string,
): GuardrailsToolView {
  const status = statusOf(details, itemStatus);
  const v = viewOf(GUARDRAILS_TEST_TOOL, status);
  const suites = detailStrings(details.suites);
  const asked = detailText(details.domain).trim();
  const rows = detailList<TestRow>(details.rows);
  const capped = cap(rows, MAX_TEST_ROWS);
  const pass = detailNumber(details.pass);
  const fail = detailNumber(details.fail);
  const total = detailNumber(details.total);
  const engine = details.engine as GuardrailEngineState | undefined;

  // One suite is the run's scope. A run over the whole directory counts its
  // suites instead, because a header cannot list twelve names and stay a line.
  v.scope =
    suites.length === 1
      ? suites[0]!
      : asked === ""
        ? counted(suites.length, "suite")
        : asked;
  v.headline =
    total === 0
      ? ""
      : partsLine(
          `${String(pass)}/${String(total)} pass`,
          fail === 0 ? "" : `${String(fail)} fail`,
        );
  v.cells = cellsOf(
    ["engine", detailText(engine?.phase)],
    ["grammars", detailList<unknown>(engine?.grammars).length],
  );
  v.sections = suiteSections(capped.shown.map(testRow));
  v.omitted = capped.omitted;
  v.note = firstLine(details.note);
  return v;
}

// ------------------------------------------------------------ fixtures

/**
 * One write to a suite.
 *
 * What an operation did — added, updated, deleted — is a position in the suite,
 * so it stands in the mono figure column rather than in a pill; only an
 * operation that could not be written wears a pill, and its reason sits under
 * the id it was keyed by.
 */
function fixtureOpRow(op: GuardrailFixtureOp): ToolPaintRow {
  const failed = detailText(op.status).trim().toLowerCase() === "fail";
  const written = detailText(op.op).trim().toLowerCase() === "write";
  return {
    key: `${op.op}/${op.id}`,
    primary: op.id,
    secondary: failed ? firstLine(op.detail) : "",
    trailing: written
      ? detailText(op.detail).trim() === "updated"
        ? "updated"
        : "added"
      : "deleted",
    badge: failed ? "failed" : "",
    tone: failed ? "bad" : "neutral",
  };
}

function fixtureView(
  details: GuardrailsFixtureUpdateDetails,
  itemStatus: string,
): GuardrailsToolView {
  const status = statusOf(details, itemStatus);
  const v = viewOf(GUARDRAILS_FIXTURE_TOOL, status);
  const ops = detailList<GuardrailFixtureOp>(details.ops);
  const capped = cap(ops, MAX_FIXTURE_ROWS);
  const before = detailNumber(details.before);

  v.scope = detailText(details.domain).trim();
  v.headline = partsLine(
    counted(detailNumber(details.written), "write"),
    counted(detailNumber(details.deleted), "deletion"),
    detailNumber(details.failed) === 0
      ? ""
      : `${String(detailNumber(details.failed))} failed`,
  );
  // `before` is -1 for a suite that did not exist a moment ago. Either way it is
  // a figure about the call, so it rides the header rather than a row.
  v.cells = cellsOf([
    "fixtures",
    before < 0 ? "new" : `${String(before)} before`,
  ]);
  v.sections = sectionOf("", capped.shown.map(fixtureOpRow));
  v.omitted = capped.omitted;
  v.note = firstLine(details.note);
  v.path = homeLabel(detailText(details.path).trim());
  return v;
}

// ------------------------------------------------------------ coverage

/**
 * One domain of a coverage scan.
 *
 * The domain names its own row, so there is no key column. How often it fired
 * is a bar measured against the busiest domain and a figure read against the
 * same end as every other row's; the state a reader opened the call for — a
 * domain that has never fired — is the pill, in a column the whole list shares
 * rather than a word hugging whatever length its domain had.
 */
function coverageRow(row: GuardrailCoverageRow, worst: number): ToolPaintRow {
  const never = detailFlag(row.never, false);
  const blocks = detailNumber(row.blocks);
  return {
    key: row.domain,
    primary: row.domain,
    secondary: "",
    // A domain that never fired is quiet, the way a change with no description
    // is quiet in the change stack: the rows that stopped something are the ones
    // a reader came for.
    primaryMuted: never,
    trailing: partsLine(
      counted(blocks, "block"),
      row.last === "" ? "" : `${row.last} ago`,
    ),
    badge: never ? "never" : "",
    tone: never ? "warn" : "ok",
    meter: worst === 0 ? null : { score: blocks, worst },
  };
}

function coverageView(
  details: GuardrailsCoverageDetails,
  itemStatus: string,
): GuardrailsToolView {
  const status = statusOf(details, itemStatus);
  const v = viewOf(GUARDRAILS_COVERAGE_TOOL, status);
  const rows = detailList<GuardrailCoverageRow>(details.rows);
  const capped = cap(rows, MAX_COVERAGE_ROWS);
  const never = rows.filter((row) => detailFlag(row.never, false)).length;
  const worst = rows.reduce(
    (top, row) => Math.max(top, detailNumber(row.blocks)),
    0,
  );
  const days = detailNumber(details.windowDays);

  v.scope = homeLabel(detailText(details.dir).trim());
  v.headline = partsLine(
    counted(rows.length, "domain"),
    never === 0 ? "" : `${String(never)} never fired`,
    days === 0 ? "every session" : `last ${String(days)}d`,
  );
  v.cells = cellsOf(
    ["files", detailNumber(details.files)],
    ["rules", detailNumber(details.ruleCount)],
  );
  v.sections = sectionOf(
    "",
    capped.shown.map((row) => coverageRow(row, worst)),
  );
  v.omitted = capped.omitted;
  v.note =
    status === "failed"
      ? firstLine(detailText(details.error))
      : status === "empty"
        ? "no rules — nothing has had a chance to fire"
        : firstLine(details.note);
  return v;
}

// -------------------------------------------------------------- the fold

type Fold = (details: unknown, itemStatus: string) => GuardrailsToolView;

const FOLD_OF_TOOL: ReadonlyMap<string, Fold> = new Map([
  [
    GUARDRAILS_TEST_TOOL,
    (details, status) => testView(details as GuardrailsTestDetails, status),
  ],
  [
    GUARDRAILS_FIXTURE_TOOL,
    (details, status) =>
      fixtureView(details as GuardrailsFixtureUpdateDetails, status),
  ],
  [
    GUARDRAILS_COVERAGE_TOOL,
    (details, status) =>
      coverageView(details as GuardrailsCoverageDetails, status),
  ],
]);

/** The view of one guardrails call, from the answer its own tool wrote. */
export function guardrailsToolViewOf(
  name: string,
  details: unknown,
  itemStatus: string,
): GuardrailsToolView | null {
  const fold = FOLD_OF_TOOL.get(name.toLowerCase());
  if (fold === undefined) return null;
  if (details === null || typeof details !== "object") return null;
  return fold(details, itemStatus);
}

/** What the header leads with: the folder, the suite, the domain. */
export const guardrailsScopeOf = (view: GuardrailsToolView): string =>
  view.scope;

/**
 * What the header trails its scope with: what the call counted, and what the
 * card would not draw. Those counts outlive the clip, so they are handed over
 * as parts rather than one joined sentence.
 *
 * A refusal says why on this line too, because the card below holds content and
 * a call that answered nothing has none.
 */
export function guardrailsTailOf(view: GuardrailsToolView): string[] {
  if (view.status === "failed") return [view.note];
  return [
    view.headline,
    view.omitted === 0 ? "" : moreLine(view.omitted, "row"),
  ];
}

/** What a card still owes the reader once the header has spoken: for a refusal,
 *  nothing — the header already said the reason. */
export const guardrailsNoteOf = (view: GuardrailsToolView): string =>
  view.status === "failed" ? "" : view.note;
