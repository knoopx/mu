/**
 * Turns what an analyser answered into what the transcript draws.
 *
 * A code-quality tool answers two audiences: `content` text in aligned columns
 * for the model, and structured `details` for the log. This file folds the
 * details into one `QualityToolView` — the chips of what was read, the tally
 * line, and rows in the shape the shared row painter already knows — so the
 * components never parse an analyser's shape and never learn a tool's name.
 *
 * Each fold takes the details interface its own tool answered with, and the
 * analyser's JSON reader (`lib/json.ts`) stays with the analyser: that reader is
 * how an external CLI's envelope is made safe, and borrowing it to read the
 * plugin's own answer put both boundaries behind one set of string keys, where a
 * renamed field reads as zero rather than failing the build. The coercion stays
 * — a session resumed this week holds JSON, not the object the tool returned —
 * but it is applied to a field the interface says is there.
 */

import {
  detailFlag,
  detailList,
  detailNumber,
  detailRecord,
  detailText,
  detailWord,
} from "../../core/lib/agent/toolDetails";
import { counted, partsLine, scopeLabel } from "../../core/lib/agent/toolText";
import type {
  ToolPaintRow,
  ToolPaintSection,
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
import type {
  CodeComplexityDetails,
  CodeComplexityParams,
  CodeDeadCodeDetails,
  CodeDeadCodeParams,
  CodeDuplicatesDetails,
  CodeDuplicatesParams,
  CodeReviewDetails,
  CodeReviewParams,
  CodeSymbolInspectDetails,
  CodeSymbolInspectParams,
  CodeSymbolReferencesDetails,
  CodeSymbolReferencesParams,
  ComplexityRow,
  DeadCodeRow,
  DuplicateRow,
  QualityAnswer,
  QualityCell,
  QualityCount,
  QualityToolStatus,
  QualityToolView,
  ReferenceRow,
  RiskRow,
  SurfaceRow,
} from "../types";

/** The status vocabulary the six tools answer in. */
const STATUSES = [
  "ok",
  "failed",
  "unsupported",
  "empty",
  "none",
] as const satisfies readonly QualityToolStatus[];

/** The arguments as they arrive on the call: JSON, whatever the tool asked for. */
type Args = Record<string, unknown>;

/** A fold in the shape the table holds it: the answer arrives as JSON. */
type ErasedFold = (
  args: Args,
  details: Args,
  itemStatus: string,
) => QualityToolView;

/**
 * One tool's fold, read from its own details and params shapes. This is the
 * single place an answer stops being `unknown`: the field names are then the
 * tool's own interface's, and the values are still read through a reader, so a
 * field an older session never answered paints as absent.
 */
const foldOf = <P, D>(
  fold: (args: P, details: D, itemStatus: string) => QualityToolView,
): ErasedFold =>
  // The one erased read: the fold is only ever handed the answer its own tool
  // wrote, once `qualityToolViewOf` has checked it is an answer at all.
  fold as ErasedFold;

const FOLD_OF_TOOL: ReadonlyMap<string, ErasedFold> = new Map([
  [CODE_COMPLEXITY_TOOL, foldOf(complexityView)],
  [CODE_DEAD_CODE_TOOL, foldOf(deadCodeView)],
  [CODE_DUPLICATES_TOOL, foldOf(duplicatesView)],
  [CODE_REVIEW_TOOL, foldOf(reviewView)],
  [CODE_SYMBOL_INSPECT_TOOL, foldOf(surfaceView)],
  [CODE_SYMBOL_REFERENCES_TOOL, foldOf(referencesView)],
]);

export function qualityToolViewOf(
  name: string,
  args: Record<string, unknown> | undefined,
  details: unknown,
  itemStatus: string,
): QualityToolView | null {
  const fold = FOLD_OF_TOOL.get(name.toLowerCase());
  if (fold === undefined) return null;

  const found = detailRecord(details);
  if (found === null || typeof found["status"] !== "string") return null;

  return fold(detailRecord(args) ?? {}, found, itemStatus);
}

/** A filter the call was pointed at, in the chip's words. */
const argOf = (value: unknown): string => detailText(value).trim();

function view(
  tool: string,
  details: QualityAnswer,
  itemStatus: string,
): QualityToolView {
  const status: QualityToolStatus =
    itemStatus === "error"
      ? "failed"
      : (detailWord(details.status, STATUSES) ?? "ok");

  return {
    tool,
    status,
    headline: "",
    cells: [],
    sections: [],
    omitted: detailNumber(details.omitted),
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
const analyserPairs = (details: {
  version: string;
  path: string;
}): (readonly [string, string])[] => [
  ["analyzer", analyzerCell("fallow", detailText(details.version))],
  ["scope", scopeLabel(detailText(details.path))],
];

function section(
  title: string,
  rows: readonly ToolPaintRow[],
): ToolPaintSection[] {
  return rows.length === 0 ? [] : [{ title, rows }];
}

const errorOf = (details: QualityAnswer): string =>
  detailText(details.error).split("\n")[0] ?? "";

/** A run that found nothing, or failed, says so in one line; a run with rows says nothing. */
function noteFor(
  status: QualityToolStatus | "",
  details: QualityAnswer,
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

const meterOf = (meter: unknown): ToolRowMeter | null => {
  const record = detailRecord(meter);
  if (record === null) return null;
  const worst = detailNumber(record["worst"]);
  return worst === 0 ? null : { score: detailNumber(record["score"]), worst };
};

/** One finding: a location in the key column, the thing and where it is, the
 *  figures it trails, and how severe it is. The figures go in the trailing
 *  column rather than running on after the path, because a long path pushed
 *  them onto a second line and left one row of the list taller than the rest. */
function findingRow(
  key: string,
  primary: string,
  secondary: string,
  badge: string,
  tone: ToolRowTone,
  meter: ToolRowMeter | null,
  trailing = "",
): ToolPaintRow {
  return { key, id: key, primary, secondary, badge, tone, meter, trailing };
}

/** Where a complexity finding is. */
const complexityWhere = (row: ComplexityRow): string => row.path;

/** What a complexity finding measures — the figures a reader scans down a column,
 *  and the `CRAP` the row's meter is drawn against. */
const complexityFigures = (row: ComplexityRow): string =>
  partsLine(
    `CC ${String(row.cyclomatic)}`,
    `cog ${String(row.cognitive)}`,
    `CRAP ${String(Math.round(row.crap))}`,
    `${String(row.lines)} ln`,
  );

function complexityView(
  args: CodeComplexityParams,
  details: CodeComplexityDetails,
  itemStatus: string,
): QualityToolView {
  const v = view(CODE_COMPLEXITY_TOOL, details, itemStatus);
  const thresholds = detailRecord(details.thresholds);
  const rows = detailList<ComplexityRow>(details.rows);

  // One chip per figure: the three thresholds are three numbers a reader scans
  // across the row, not one sentence, and a cell that joined them with ` · ` made
  // a single wide chip that lost its last two figures to the header's clip.
  v.cells = cellsOf(
    ...analyserPairs(details),
    ["cc", detailNumber(thresholds?.cyclomatic)],
    ["cognitive", detailNumber(thresholds?.cognitive)],
    ["crap", detailNumber(thresholds?.crap)],
    ["functions", detailNumber(details.functions_analyzed)],
    ["sort", argOf(args.sort)],
  );
  v.headline =
    rows.length === 0
      ? ""
      : partsLine(
          `${counted(detailNumber(details.above_threshold), "function")} over threshold`,
        );
  v.sections = section(
    "",
    rows.map((row) =>
      findingRow(
        row.at,
        row.symbol === "" ? "(anonymous)" : row.symbol,
        complexityWhere(row),
        row.severity,
        severityTone(row.severity),
        meterOf(row.meter),
        complexityFigures(row),
      ),
    ),
  );
  v.note = noteFor(v.status, details, "no function is over the thresholds");
  return v;
}

function deadCodeView(
  args: CodeDeadCodeParams,
  details: CodeDeadCodeDetails,
  itemStatus: string,
): QualityToolView {
  const v = view(CODE_DEAD_CODE_TOOL, details, itemStatus);
  const rows = detailList<DeadCodeRow>(details.rows);

  v.cells = cellsOf(
    ...analyserPairs(details),
    ["scope filter", argOf(args.scope)],
    ["entry points", detailNumber(details.entry_points)],
    ...detailList<QualityCount>(details.counts).map(
      (entry) => [entry.kind, entry.count] as const,
    ),
  );
  v.headline =
    rows.length === 0
      ? ""
      : partsLine(counted(detailNumber(details.total_issues), "issue"));
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
  _args: CodeDuplicatesParams,
  details: CodeDuplicatesDetails,
  itemStatus: string,
): QualityToolView {
  const v = view(CODE_DUPLICATES_TOOL, details, itemStatus);
  const rows = detailList<DuplicateRow>(details.rows);
  const percentage = detailNumber(details.duplication_percentage);

  v.cells = cellsOf(
    ...analyserPairs(details),
    ["files", detailNumber(details.total_files)],
    [
      "duplicated",
      `${String(detailNumber(details.duplicated_lines))} of ${String(
        detailNumber(details.total_lines),
      )} lines`,
    ],
    ["files with clones", detailNumber(details.files_with_clones)],
  );
  v.headline =
    rows.length === 0
      ? ""
      : partsLine(
          counted(rows.length, "clone group"),
          percentage === 0 ? "" : `${percentage.toFixed(2)}% duplicated`,
        );

  v.sections = section(
    "",
    rows.map((row) => ({
      key: row.fingerprint.replace(/^dup:/, "").slice(0, 8),
      id: row.fingerprint.replace(/^dup:/, "").slice(0, 8),
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
  args: CodeReviewParams,
  details: CodeReviewDetails,
  itemStatus: string,
): QualityToolView {
  const v = view(CODE_REVIEW_TOOL, details, itemStatus);
  const rows = detailList<RiskRow>(details.rows);
  const risks = detailList<QualityCount>(details.risk_counts);
  const target = detailText(details.target);

  v.cells = cellsOf(
    ["analyzer", "inspect"],
    ["target", target],
    ["repo", scopeLabel(detailText(details.repo))],
    ["min risk", argOf(args.min_risk)],
    ["groups", detailNumber(details.groups)],
    ["in graph", detailNumber(details.entities_in_graph)],
  );
  v.headline =
    rows.length === 0
      ? ""
      : partsLine(
          `${counted(detailNumber(details.entities_changed), "entity")} changed`,
          ...risks.map((risk) => `${String(risk.count)} ${risk.kind}`),
        );
  v.sections = section(
    "",
    rows.map((row) =>
      findingRow(
        row.at,
        row.entity,
        partsLine(row.type, row.file, row.public_api ? "public api" : ""),
        row.risk === "" ? row.change : `${row.risk} ${row.change}`,
        severityTone(row.risk),
        meterOf(row.meter),
        partsLine(
          row.dependents > 0 ? `${String(row.dependents)} deps in` : "",
          `blast ${String(row.blast)}`,
        ),
      ),
    ),
  );
  v.note = noteFor(v.status, details, `no entities changed in ${target}`);
  return v;
}

function surfaceView(
  _args: CodeSymbolInspectParams,
  details: CodeSymbolInspectDetails,
  itemStatus: string,
): QualityToolView {
  const v = view(CODE_SYMBOL_INSPECT_TOOL, details, itemStatus);
  const rows = detailList<SurfaceRow>(details.rows);
  const hotspots = detailList<ComplexityRow>(details.hotspots);
  const path = detailText(details.path);
  const symbol = detailText(details.symbol);

  v.cells = cellsOf(
    ["analyzer", analyzerCell("fallow", detailText(details.version))],
    ["file", path],
    ["symbol", symbol],
    ["reachable", detailFlag(details.reachable, false) ? "yes" : "no"],
    ["entry point", detailFlag(details.entry_point, false) ? "yes" : ""],
    ["imports", detailNumber(details.import_count)],
    ["read by", detailNumber(details.imported_by_count)],
  );
  v.headline =
    rows.length === 0 && symbol === ""
      ? ""
      : partsLine(
          counted(rows.length, "export"),
          detailNumber(details.duplicates) > 0
            ? `${String(detailNumber(details.duplicates))} clone matches`
            : "",
        );

  const surface: ToolPaintRow[] = rows.map((row) => ({
    key: `×${String(row.consumers)}`,
    id: `×${String(row.consumers)}`,
    primary: row.name,
    secondary: row.type_only ? "type only" : "",
    badge: row.consumers === 0 ? "unused" : "",
    tone: row.consumers === 0 ? "warn" : "neutral",
  }));

  const hot: ToolPaintRow[] = hotspots.map((row) =>
    findingRow(
      row.at,
      row.symbol,
      "",
      row.severity,
      severityTone(row.severity),
      meterOf(row.meter),
      complexityFigures(row),
    ),
  );

  v.sections = [
    ...section("", surface),
    ...section("complexity in this file", hot),
  ];
  v.note = noteFor(
    v.status,
    details,
    detailText(details.reason) === ""
      ? `${path} has no exports`
      : detailText(details.reason),
  );
  return v;
}

function referencesView(
  args: CodeSymbolReferencesParams,
  details: CodeSymbolReferencesDetails,
  itemStatus: string,
): QualityToolView {
  const v = view(CODE_SYMBOL_REFERENCES_TOOL, details, itemStatus);
  const callers = detailList<ReferenceRow>(details.callers);
  const callees = detailList<ReferenceRow>(details.callees);
  const file = detailText(details.file);
  const symbol = detailText(details.symbol);

  v.cells = cellsOf(
    ["analyzer", analyzerCell("fallow", detailText(details.version))],
    ["file", file],
    ["symbol", symbol],
    ["depth", detailNumber(details.depth)],
    ["scope", argOf(args.root)],
  );
  v.headline =
    callers.length + callees.length === 0
      ? ""
      : partsLine(
          counted(callers.length, "caller"),
          counted(callees.length, "callee"),
          detailNumber(details.unresolved_count) > 0
            ? `${String(detailNumber(details.unresolved_count))} unresolved`
            : "",
        );

  // The id column is the hop number and nothing else: the section head above the
  // rows already says which way the chain runs, so a direction word in every id
  // was ink that repeated a head and widened the narrowest column in the table.
  const paint = (edges: readonly ReferenceRow[]): ToolPaintRow[] =>
    edges.map((row) => ({
      key: String(row.depth),
      id: String(row.depth),
      primary: row.name === "" ? row.file : row.name,
      secondary: row.file === "" ? "(project edge)" : row.file,
      badge: row.type_only ? "type" : "",
      tone: "neutral",
      trailing: row.file === "" ? "external" : "",
    }));

  v.sections = [
    ...section(
      `callers — ${String(detailNumber(details.caller_count))}`,
      paint(callers),
    ),
    ...section(
      `callees — ${String(detailNumber(details.callee_count))}`,
      paint(callees),
    ),
  ];
  v.note = noteFor(
    v.status,
    details,
    detailText(details.reason) === ""
      ? `no call chain reaches ${file}:${symbol}`
      : detailText(details.reason),
  );
  return v;
}

export function qualityCellOf(view: QualityToolView, label: string): string {
  return view.cells.find((cell) => cell.label === label)?.value ?? "";
}
