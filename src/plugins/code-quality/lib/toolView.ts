/**
 * Turns what an analyser answered into what the transcript draws.
 *
 * A code-quality tool answers two audiences: `content` text in aligned columns
 * for the model, and structured `details` for the log. This file folds the
 * details into one `QualityToolView` — the chips of what was read, the tally
 * line, and rows in the shape the shared row painter already knows — so the
 * components never parse an analyser's shape and never learn a tool's name.
 */

import { counted, partsLine, scopeLabel } from "../../core/lib/agent/toolText";
import type {
  ToolPaintRow,
  ToolRowMeter,
  ToolRowTone,
} from "../../core/lib/ui/toolRowPaint";
import {
  CODE_COMPLEXITY_TOOL,
  CODE_DEAD_CODE_TOOL,
  CODE_DUPLICATES_TOOL,
  CODE_REVIEW_TOOL,
  CODE_SYMBOL_INSPECT_TOOL,
  CODE_SYMBOL_REFERENCES_TOOL,
} from "../constants";
import { analyzerCell } from "./answer";
import { listOf, numberOf, recordOf, textOf, type JsonRecord } from "./json";
import type {
  ComplexityRow,
  QualityCell,
  QualitySection,
  QualityToolStatus,
  QualityToolView,
  RiskRow,
  SurfaceRow,
} from "../types";

const STATUSES: readonly string[] = ["ok", "failed", "unsupported", "empty", "none"];

type Args = JsonRecord;
type Details = JsonRecord;

type Fold = (args: Args, details: Details, itemStatus: string) => QualityToolView;

const FOLD_OF_TOOL: ReadonlyMap<string, Fold> = new Map([
  [CODE_COMPLEXITY_TOOL, complexityView],
  [CODE_DEAD_CODE_TOOL, deadCodeView],
  [CODE_DUPLICATES_TOOL, duplicatesView],
  [CODE_REVIEW_TOOL, reviewView],
  [CODE_SYMBOL_INSPECT_TOOL, surfaceView],
  [CODE_SYMBOL_REFERENCES_TOOL, referencesView],
]);

export function qualityToolViewOf(
  name: string,
  args: Record<string, unknown> | undefined,
  details: unknown,
  itemStatus: string,
): QualityToolView | null {
  const fold = FOLD_OF_TOOL.get(name.toLowerCase());
  if (fold === undefined) return null;

  const found = recordOf(details);
  if (found === null || typeof found["status"] !== "string") return null;

  return fold(recordOf(args) ?? {}, found, itemStatus);
}

const rowsOf = <T,>(value: unknown): T[] => listOf(value) as T[];

function countsOf(value: unknown): { kind: string; count: number }[] {
  return rowsOf<JsonRecord>(value).map((entry) => ({
    kind: textOf(entry, "kind"),
    count: numberOf(entry, "count"),
  }));
}

const argOf = (args: Args, key: string): string => textOf(args, key).trim();

function view(
  tool: string,
  details: Details,
  itemStatus: string,
): QualityToolView {
  const stated = textOf(details, "status").trim();
  const status: QualityToolStatus =
    itemStatus === "error" ? "failed" : STATUSES.includes(stated) ? (stated as QualityToolStatus) : "ok";

  return {
    tool,
    status,
    headline: "",
    cells: [],
    sections: [],
    omitted: numberOf(details, "omitted"),
    note: "",
  };
}

function cellsOf(
  ...pairs: readonly (readonly [string, string | number])[]
): QualityCell[] {
  return pairs
    .map(([label, value]) => ({ label, value: String(value) }))
    .filter((cell) => cell.value !== "" && cell.value !== "0");
}

/** The two cells every analyser view states: what ran, and the scope it ran on. */
const analyserPairs = (details: Details): (readonly [string, string])[] => [
  ["analyzer", analyzerCell("fallow", textOf(details, "version"))],
  ["scope", scopeLabel(textOf(details, "path"))],
];

function section(title: string, rows: readonly ToolPaintRow[]): QualitySection[] {
  return rows.length === 0 ? [] : [{ title, rows }];
}

const errorOf = (details: Details): string =>
  textOf(details, "error").split("\n")[0] ?? "";

/** A run that found nothing, or failed, says so in one line; a run with rows says nothing. */
function noteFor(
  status: QualityToolStatus | "",
  details: Details,
  nothingFound: string,
): string {
  if (status === "failed" || status === "unsupported") return errorOf(details);
  return status === "ok" ? "" : nothingFound;
}

/** How a finding's severity colours its row. */
function severityTone(severity: string): ToolRowTone {
  const key = severity.toLowerCase();
  if (key === "critical" || key === "error") return "bad";
  if (key === "high" || key === "warn" || key === "warning") return "warn";
  return "neutral";
}

const meterOf = (details: unknown): ToolRowMeter | null => {
  const meter = recordOf(details);
  if (meter === null) return null;
  const worst = numberOf(meter, "worst");
  return worst === 0 ? null : { score: numberOf(meter, "score"), worst };
};

/** One finding: a location in the key column, the thing and where it is, and how severe it is. */
function findingRow(
  key: string,
  primary: string,
  secondary: string,
  badge: string,
  tone: ToolRowTone,
  meter: ToolRowMeter | null,
): ToolPaintRow {
  return { key, primary, secondary, badge, tone, meter };
}

const complexityText = (row: ComplexityRow, withPath: boolean): string =>
  partsLine(
    withPath ? row.path : "",
    `CC ${String(row.cyclomatic)}`,
    `cog ${String(row.cognitive)}`,
    `CRAP ${String(Math.round(row.crap))}`,
    withPath ? `${String(row.lines)} ln` : "",
  );



function complexityView(
  args: Args,
  details: Details,
  itemStatus: string,
): QualityToolView {
  const v = view(CODE_COMPLEXITY_TOOL, details, itemStatus);
  const thresholds = recordOf(details["thresholds"]);
  const rows = rowsOf<ComplexityRow>(details["rows"]);

  v.cells = cellsOf(
    ...analyserPairs(details),
    [
      "thresholds",
      partsLine(
        `CC ${String(numberOf(thresholds, "cyclomatic"))}`,
        `cognitive ${String(numberOf(thresholds, "cognitive"))}`,
        `CRAP ${String(numberOf(thresholds, "crap"))}`,
      ),
    ],
    ["functions", numberOf(details, "functions_analyzed")],
    ["sort", argOf(args, "sort")],
  );
  v.headline =
    rows.length === 0
      ? ""
      : partsLine(
          `${counted(numberOf(details, "above_threshold"), "function")} over threshold`,
          rows.length < numberOf(details, "above_threshold")
            ? `showing ${String(rows.length)}`
            : "",
        );
  v.sections = section(
    "",
    rows.map((row) =>
      findingRow(
        row.at,
        row.symbol === "" ? "(anonymous)" : row.symbol,
        complexityText(row, true),
        row.severity,
        severityTone(row.severity),
        meterOf(row.meter),
      ),
    ),
  );
  v.note = noteFor(
    v.status,
    details,
    "no function is over the thresholds",
  );
  return v;
}



function deadCodeView(
  args: Args,
  details: Details,
  itemStatus: string,
): QualityToolView {
  const v = view(CODE_DEAD_CODE_TOOL, details, itemStatus);
  const rows = rowsOf<{
    kind: string;
    path: string;
    symbol: string;
    at: string;
    severity: string;
    fixable: boolean;
  }>(details["rows"]);

  v.cells = cellsOf(
    ...analyserPairs(details),
    ["scope filter", argOf(args, "scope")],
    ["entry points", numberOf(details, "entry_points")],
    ...countsOf(details["counts"]).map(
      (entry) => [entry.kind, entry.count] as const,
    ),
  );
  v.headline =
    rows.length === 0
      ? ""
      : partsLine(
          counted(numberOf(details, "total_issues"), "issue"),
          v.omitted > 0 ? `showing ${String(rows.length)}` : "",
        );
  v.sections = section(
    "",
    rows.map((row, index) =>
      findingRow(
        row.at === "" ? String(index + 1) : row.at,
        row.symbol,
        partsLine(row.path, row.fixable ? "auto-fixable" : ""),
        row.kind,
        row.fixable ? "ok" : "neutral",
        null,
      ),
    ),
  );
  v.note = noteFor(v.status, details, "nothing unused found");
  return v;
}



function duplicatesView(
  _args: Args,
  details: Details,
  itemStatus: string,
): QualityToolView {
  const v = view(CODE_DUPLICATES_TOOL, details, itemStatus);
  const rows = rowsOf<{
    fingerprint: string;
    lines: number;
    tokens: number;
    spread: number;
    instances: { file: string; from: number; to: number }[];
    fixable: boolean;
  }>(details["rows"]);
  const percentage = numberOf(details, "duplication_percentage");

  v.cells = cellsOf(
    ...analyserPairs(details),
    ["files", numberOf(details, "total_files")],
    [
      "duplicated",
      `${String(numberOf(details, "duplicated_lines"))} of ${String(
        numberOf(details, "total_lines"),
      )} lines`,
    ],
    ["files with clones", numberOf(details, "files_with_clones")],
  );
  v.headline =
    rows.length === 0
      ? ""
      : partsLine(
          counted(rows.length, "clone group"),
          percentage === 0 ? "" : `${percentage.toFixed(2)}% duplicated`,
          v.omitted > 0 ? `showing ${String(rows.length)}` : "",
        );

  v.sections = section(
    "",
    rows.map((row) => ({
      key: row.fingerprint.replace(/^dup:/, "").slice(0, 8),
      primary: `${counted(row.lines, "line")} × ${counted(
        row.instances.length,
        "instance",
      )}`,
      secondary: `${String(row.tokens)} tokens${
        row.spread === 0 ? "" : ` · spread ${String(row.spread)}`
      }${row.fixable ? " · extractable" : ""}`,
      badge: row.instances.length > 2 ? "widespread" : "",
      tone: row.instances.length > 2 ? "warn" : "neutral",
      members: row.instances.map(
        (instance) =>
          `${instance.file}:${String(instance.from)}-${String(instance.to)}`,
      ),
    })),
  );
  v.note = noteFor(
    v.status,
    details,
    "no clone groups over the detection floor",
  );
  return v;
}



function reviewView(
  args: Args,
  details: Details,
  itemStatus: string,
): QualityToolView {
  const v = view(CODE_REVIEW_TOOL, details, itemStatus);
  const rows = rowsOf<RiskRow>(details["rows"]);
  const risks = countsOf(details["risk_counts"]);

  v.cells = cellsOf(
    ["analyzer", "inspect"],
    ["target", textOf(details, "target")],
    ["repo", scopeLabel(textOf(details, "repo"))],
    ["min risk", argOf(args, "min_risk")],
    ["groups", numberOf(details, "groups")],
    ["in graph", numberOf(details, "entities_in_graph")],
  );
  v.headline =
    rows.length === 0
      ? ""
      : partsLine(
          `${counted(numberOf(details, "entities_changed"), "entity")} changed`,
          ...risks.map((risk) => `${String(risk.count)} ${risk.kind}`),
          v.omitted > 0 ? `showing ${String(rows.length)}` : "",
        );
  v.sections = section(
    "",
    rows.map((row) =>
      findingRow(
        row.at,
        row.entity,
        partsLine(
          row.type,
          row.file,
          row.dependents > 0 ? `${String(row.dependents)} deps in` : "",
          row.public_api ? "public api" : "",
          `blast ${String(row.blast)}`,
        ),
        row.risk === "" ? row.change : `${row.risk} ${row.change}`,
        severityTone(row.risk),
        meterOf(row.meter),
      ),
    ),
  );
  v.note = noteFor(
    v.status,
    details,
    `no entities changed in ${textOf(details, "target")}`,
  );
  return v;
}



function surfaceView(
  args: Args,
  details: Details,
  itemStatus: string,
): QualityToolView {
  const v = view(CODE_SYMBOL_INSPECT_TOOL, details, itemStatus);
  const rows = rowsOf<SurfaceRow>(details["rows"]);
  const hotspots = rowsOf<ComplexityRow>(details["hotspots"]);

  v.cells = cellsOf(
    ["analyzer", analyzerCell("fallow", textOf(details, "version"))],
    ["file", textOf(details, "path")],
    ["symbol", textOf(details, "symbol")],
    ["reachable", details["reachable"] === true ? "yes" : "no"],
    ["entry point", details["entry_point"] === true ? "yes" : ""],
    ["imports", numberOf(details, "import_count")],
    ["read by", numberOf(details, "imported_by_count")],
  );
  v.headline =
    rows.length === 0 && textOf(details, "symbol") === ""
      ? ""
      : partsLine(
          counted(rows.length, "export"),
          numberOf(details, "duplicates") > 0
            ? `${String(numberOf(details, "duplicates"))} clone matches`
            : "",
          v.omitted > 0 ? `showing ${String(rows.length)}` : "",
        );

  const surface: ToolPaintRow[] = rows.map((row) => ({
    key: `×${String(row.consumers)}`,
    primary: row.name,
    secondary: row.type_only ? "type only" : "",
    badge: row.consumers === 0 ? "unused" : "",
    tone: row.consumers === 0 ? "warn" : "neutral",
  }));

  const hot: ToolPaintRow[] = hotspots.map((row) =>
    findingRow(
      row.at,
      row.symbol,
      complexityText(row, false),
      row.severity,
      severityTone(row.severity),
      meterOf(row.meter),
    ),
  );

  v.sections = [
    ...section("", surface),
    ...section("complexity in this file", hot),
  ];
  v.note = noteFor(
    v.status,
    details,
    textOf(details, "reason") === ""
      ? `${textOf(details, "path")} has no exports`
      : textOf(details, "reason"),
  );
  return v;
}



function referencesView(
  args: Args,
  details: Details,
  itemStatus: string,
): QualityToolView {
  const v = view(CODE_SYMBOL_REFERENCES_TOOL, details, itemStatus);
  const callers = rowsOf<{
    name: string;
    file: string;
    depth: number;
    type_only: boolean;
    via: string;
  }>(details["callers"]);
  const callees = rowsOf<{
    name: string;
    file: string;
    depth: number;
    type_only: boolean;
    via: string;
  }>(details["callees"]);

  v.cells = cellsOf(
    ["analyzer", analyzerCell("fallow", textOf(details, "version"))],
    ["file", textOf(details, "file")],
    ["symbol", textOf(details, "symbol")],
    ["depth", numberOf(details, "depth")],
    ["scope", argOf(args, "root")],
  );
  v.headline =
    callers.length + callees.length === 0
      ? ""
      : partsLine(
          counted(callers.length, "caller"),
          counted(callees.length, "callee"),
          numberOf(details, "unresolved_count") > 0
            ? `${String(numberOf(details, "unresolved_count"))} unresolved`
            : "",
        );

  const paint = (
    edges: typeof callers,
    verb: string,
  ): ToolPaintRow[] =>
    edges.map((row) => ({
      key: `${verb} ${String(row.depth)}`,
      primary: row.name === "" ? row.file : row.name,
      secondary: row.file === "" ? "(project edge)" : row.file,
      badge: row.type_only ? "type" : "",
      tone: "neutral",
      trailing: row.file === "" ? "external" : "",
    }));

  v.sections = [
    ...section(`callers — ${String(numberOf(details, "caller_count"))}`, paint(callers, "up")),
    ...section(`callees — ${String(numberOf(details, "callee_count"))}`, paint(callees, "down")),
  ];
  v.note = noteFor(
    v.status,
    details,
    textOf(details, "reason") === ""
      ? `no call chain reaches ${textOf(details, "file")}:${textOf(details, "symbol")}`
      : textOf(details, "reason"),
  );
  return v;
}

export function qualityCellOf(view: QualityToolView, label: string): string {
  return view.cells.find((cell) => cell.label === label)?.value ?? "";
}

export function qualityRowsOf(view: QualityToolView): ToolPaintRow[] {
  return view.sections.flatMap((entry) => [...entry.rows]);
}
