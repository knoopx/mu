/**
 * Reading an analyser's envelope.
 *
 * `fallow` answers every question with one JSON envelope whose keys differ per
 * command. Each function here turns one of those envelopes into the details
 * object a tool returns: the summary the analyser states, the findings it
 * found, and the status the transcript paints. A missing key reads as empty
 * rather than throwing, because a version of the analyser that renames a field
 * must cost a row, not a call.
 */

import { runFallow, scopeDir, type AnalyserRun } from "./cli";
import {
  listOf,
  numberOf,
  parseEnvelope,
  recordOf,
  recordsOf,
  sectionOf,
  stringsOf,
  textOf,
  type JsonRecord,
} from "./json";
import { DEFAULT_TRACE_DEPTH, GATE_NOTE } from "../constants";
import type {
  CodeComplexityDetails,
  CodeDeadCodeDetails,
  CodeDuplicatesDetails,
  CodeSymbolInspectDetails,
  CodeSymbolReferencesDetails,
  ComplexityRow,
  DeadCodeRow,
  DuplicateInstance,
  DuplicateRow,
  QualityCount,
  QualityToolStatus,
  ReferenceRow,
  SurfaceRow,
} from "../types";


interface QualityToolHead {
  analyzer: "fallow";
  version: string;
  status: QualityToolStatus;
  omitted: number;
  elapsed_ms: number;
  error: string;
}

interface FallowRun {
  envelope: JsonRecord | null;
  run: AnalyserRun;
  version: string;
  elapsed: number;
  message: string;
}

async function fallow(
  args: readonly string[],
  path: string | undefined,
): Promise<FallowRun> {
  const scope = scopeDir(path);
  if (scope.error !== "")
    return {
      envelope: null,
      run: {
        stdout: "",
        stderr: scope.error,
        code: 1,
        status: "unsupported",
        error: scope.error,
        command: `analyser ${args.join(" ")}`,
      },
      version: "",
      elapsed: 0,
      message: scope.error,
    };

  const run = await runFallow(args, scope.dir);
  const envelope = parseEnvelope(run.stdout);
  const error = recordOf(envelope?.["error"]) ?? envelope;
  const complained = envelope !== null && error?.["error"] === true;

  return {
    envelope,
    run,
    version: textOf(envelope, "version"),
    elapsed: numberOf(envelope, "elapsed_ms"),
    message: complained ? textOf(error, "message") : "",
  };
}


/**
 * The head every answer carries: the analyser that ran, the version that
 * answered, how the call ended, and how long it took. A tool adds its own
 * counts and rows below this, so the head of one answer can never drift from
 * the head of another.
 */
const baseOf = (found: FallowRun): QualityToolHead => ({
  analyzer: "fallow",
  version: found.version,
  status: "ok",
  omitted: 0,
  elapsed_ms: found.elapsed,
  error: "",
});

function failedOf(found: FallowRun): { status: QualityToolStatus; error: string } {
  if (found.run.status !== "ok")
    return { status: found.run.status, error: found.run.error };
  if (found.message !== "")
    return { status: "failed", error: found.message };
  return { status: "failed", error: found.run.stderr.trim() };
}

const actionIsCheap = (entry: unknown): boolean =>
  recordOf(entry)?.["auto_fixable"] === true;

const anyCheapAction = (record: JsonRecord): boolean =>
  listOf(record["actions"]).some(actionIsCheap);

/** The first value that is actually there — an analyser names a thing differently per finding kind. */
const firstText = (...values: readonly string[]): string =>
  values.find((value) => value !== "") ?? "";



const SEVERITY_ORDER = ["critical", "high", "moderate", "low", "warn"];

const severityRank = (severity: string): number => {
  const index = SEVERITY_ORDER.indexOf(severity.toLowerCase());
  return index < 0 ? SEVERITY_ORDER.length : index;
};

const rowOfComplexity = (record: JsonRecord): ComplexityRow => ({
  path: textOf(record, "path"),
  symbol: textOf(record, "name"),
  at: `${String(numberOf(record, "line"))}:${String(numberOf(record, "col"))}`,
  cyclomatic: numberOf(record, "cyclomatic"),
  cognitive: numberOf(record, "cognitive"),
  crap: numberOf(record, "crap"),
  lines: numberOf(record, "line_count"),
  exceeded: textOf(record, "exceeded"),
  severity: firstText(textOf(record, "severity"), textOf(record, "effective_severity")),
  fixable: anyCheapAction(record),
  meter: { score: 0, worst: 0 },
});

/**
 * Each row's own score, against the worst score in the same answer — the pair a
 * meter is drawn from. The score is CRAP, the largest figure the row prints, on
 * purpose: a bar must be a reading of a number the reader can see, so two rows
 * that both say `CRAP 110` draw the same bar. Scoring the row on its worst
 * complexity figure instead leaves a bar that measures something no line of the
 * row says, and equal numbers draw unequal bars.
 */
function metered(rows: readonly ComplexityRow[]): ComplexityRow[] {
  const worst = rows.reduce((top, row) => Math.max(top, Math.round(row.crap)), 0);
  return rows.map((row) => ({
    ...row,
    meter: { score: Math.round(row.crap), worst },
  }));
}

function sorted(rows: readonly ComplexityRow[], sort: string | undefined): ComplexityRow[] {
  const copy = [...rows];
  if (sort === "complexity")
    return copy.sort((a, b) => b.cyclomatic - a.cyclomatic);
  if (sort === "file")
    return copy.sort(
      (a, b) =>
        a.path.localeCompare(b.path) ||
        Number(a.at.split(":")[0]) - Number(b.at.split(":")[0]),
    );
  return copy.sort(
    (a, b) =>
      severityRank(a.severity) - severityRank(b.severity) ||
      b.crap - a.crap ||
      b.cyclomatic - a.cyclomatic,
  );
}

export async function fallowComplexity(
  path: string | undefined,
  limit: number,
  sort: string | undefined,
): Promise<CodeComplexityDetails> {
  const found = await fallow(["health", "--complexity", "--lean"], path);
  const empty: CodeComplexityDetails = {
    ...baseOf(found),
    path: (path ?? "").trim(),
    files_analyzed: 0,
    functions_analyzed: 0,
    above_threshold: 0,
    thresholds: { cyclomatic: 0, cognitive: 0, crap: 0 },
    severity_counts: [],
    rows: [],
  };

  if (found.envelope === null) return { ...empty, ...failedOf(found) };

  const summary = recordOf(found.envelope["summary"]);
  const findings = recordsOf(found.envelope["findings"]).map(rowOfComplexity);
  const shown = sorted(findings, sort).slice(0, Math.max(limit, 1));
  const severities: readonly (readonly [string, number])[] = [
    ["critical", numberOf(summary, "severity_critical_count")],
    ["high", numberOf(summary, "severity_high_count")],
    ["moderate", numberOf(summary, "severity_moderate_count")],
  ];

  return {
    ...empty,
    status: findings.length === 0 ? "none" : "ok",
    files_analyzed: numberOf(summary, "files_analyzed"),
    functions_analyzed: numberOf(summary, "functions_analyzed"),
    above_threshold: numberOf(summary, "functions_above_threshold"),
    thresholds: {
      cyclomatic: numberOf(summary, "max_cyclomatic_threshold"),
      cognitive: numberOf(summary, "max_cognitive_threshold"),
      crap: numberOf(summary, "max_crap_threshold"),
    },
    severity_counts: severities
      .filter(([, count]) => count > 0)
      .map(([kind, count]) => ({ kind, count })),
    rows: metered(shown),
    omitted: Math.max(0, findings.length - shown.length),
    error: findings.length === 0 ? "" : GATE_NOTE,
  };
}



/** What each `scope` of `code-dead-code` answers with, by the envelope keys it reads. */
const DEAD_KINDS: ReadonlyMap<string, { label: string; groups: readonly string[] }> =
  new Map([
    ["files", { label: "file", groups: ["files"] }],
    ["exports", { label: "export", groups: ["exports"] }],
    ["types", { label: "type", groups: ["types"] }],
    ["members", { label: "member", groups: ["members"] }],
    [
      "deps",
      {
        label: "dependency",
        groups: ["dependencies", "binaries", "duplicates"],
      },
    ],
  ]);

/** The category an envelope key reports, without the prefix the analyser hangs off it. */
const deadGroupOf = (key: string): string =>
  key.replace(/^unused_/, "").replace(/^unlisted_/, "").replace(/^duplicate_/, "");

/** What a reader calls that category: `unused_class_members` is an unused class member. */
const deadKindOf = (key: string): string =>
  key.replace(/_/g, " ").replace(/s$/, "");

interface DeadGroup {
  kind: string;
  entries: JsonRecord[];
}

/** Every array the envelope reports findings in, kept or dropped by the scope the call asked for. */
function deadGroupsOf(
  envelope: JsonRecord,
  groups: readonly string[] | null,
): DeadGroup[] {
  return Object.entries(envelope).flatMap(([key, value]) => {
    const entries = recordsOf(value);
    if (entries.length === 0) return [];
    if (groups !== null && !groups.includes(deadGroupOf(key))) return [];
    return [{ kind: deadKindOf(key), entries }];
  });
}

/** The name of an unused thing: an export, a package, a binary, a member of a parent, or the file itself. */
function deadNameOf(record: JsonRecord): string {
  const named = firstText(
    textOf(record, "export_name"),
    textOf(record, "package_name"),
    textOf(record, "binary_name"),
  );
  if (named !== "") return named;

  const parent = textOf(record, "parent_name");
  const member = textOf(record, "member_name");
  if (member !== "") return parent === "" ? member : `${parent}.${member}`;

  return textOf(record, "path");
}

const deadRowOf = (kind: string, record: JsonRecord): DeadCodeRow => {
  const locations = recordsOf(record["locations"]);
  const name = deadNameOf(record);
  const line = numberOf(record, "line");
  return {
    kind,
    path: firstText(
      textOf(record, "path"),
      locations.map((spot) => textOf(spot, "path")).join(", "),
    ),
    symbol: name === "" ? "(unnamed)" : name,
    at: line === 0 ? "" : String(line),
    severity: textOf(record, "effective_severity"),
    fixable: anyCheapAction(record),
  };
};

export async function fallowDeadCode(
  path: string | undefined,
  limit: number,
  scope: string | undefined,
): Promise<CodeDeadCodeDetails> {
  const found = await fallow(["dead-code", "--lean"], path);
  const empty: CodeDeadCodeDetails = {
    ...baseOf(found),
    path: (path ?? "").trim(),
    total_issues: 0,
    entry_points: 0,
    counts: [],
    rows: [],
  };

  if (found.envelope === null) return { ...empty, ...failedOf(found) };

  const wanted = DEAD_KINDS.get((scope ?? "all").toLowerCase());
  const groups = deadGroupsOf(found.envelope, wanted === undefined ? null : wanted.groups);
  const rows = groups.flatMap((group) =>
    group.entries.map((entry) => deadRowOf(group.kind, entry)),
  );
  const counts: QualityCount[] = groups.map((group) => ({
    kind: group.kind,
    count: group.entries.length,
  }));
  const shown = rows.slice(0, Math.max(limit, 1));

  return {
    ...empty,
    status: rows.length === 0 ? "none" : "ok",
    total_issues: numberOf(found.envelope, "total_issues"),
    entry_points: numberOf(recordOf(found.envelope["entry_points"]), "total"),
    counts,
    rows: shown,
    omitted: Math.max(0, rows.length - shown.length),
    error: "",
  };
}



const instanceOf = (record: JsonRecord): DuplicateInstance => ({
  file: textOf(record, "file"),
  from: numberOf(record, "start_line"),
  to: numberOf(record, "end_line"),
});

export async function fallowDupes(
  path: string | undefined,
  limit: number,
): Promise<CodeDuplicatesDetails> {
  const found = await fallow(["dupes"], path);
  const empty: CodeDuplicatesDetails = {
    ...baseOf(found),
    path: (path ?? "").trim(),
    total_files: 0,
    files_with_clones: 0,
    total_lines: 0,
    duplicated_lines: 0,
    duplication_percentage: 0,
    clone_groups: 0,
    clone_instances: 0,
    rows: [],
  };

  if (found.envelope === null) return { ...empty, ...failedOf(found) };

  const stats = recordOf(found.envelope["stats"]);
  const rows: DuplicateRow[] = recordsOf(found.envelope["clone_groups"])
    .map((group) => ({
      fingerprint: textOf(group, "fingerprint"),
      lines: numberOf(group, "line_count"),
      tokens: numberOf(group, "token_count"),
      spread: numberOf(group, "spread"),
      instances: recordsOf(group["instances"]).map(instanceOf),
      fixable: anyCheapAction(group),
    }))
    .sort(
      (a, b) => b.lines - a.lines || b.instances.length - a.instances.length,
    );

  return {
    ...empty,
    status: rows.length === 0 ? "none" : "ok",
    total_files: numberOf(stats, "total_files"),
    files_with_clones: numberOf(stats, "files_with_clones"),
    total_lines: numberOf(stats, "total_lines"),
    duplicated_lines: numberOf(stats, "duplicated_lines"),
    duplication_percentage: numberOf(stats, "duplication_percentage"),
    clone_groups: numberOf(stats, "clone_groups"),
    clone_instances: numberOf(stats, "clone_instances"),
    rows: rows.slice(0, Math.max(limit, 1)),
    omitted: Math.max(0, rows.length - Math.max(limit, 1)),
    error: "",
  };
}



const surfaceRowOf = (record: JsonRecord): SurfaceRow => ({
  name: textOf(record, "name"),
  kind: textOf(record, "kind"),
  consumers: numberOf(record, "reference_count"),
  at: "",
  type_only: record["is_type_only"] === true,
});

/** What the analyser says about the file itself, with the counts it left out filled from the rows. */
function identityOf(
  envelope: JsonRecord,
  exports: number,
  readers: number,
): Pick<
  CodeSymbolInspectDetails,
  | "reachable"
  | "entry_point"
  | "used"
  | "reason"
  | "export_count"
  | "import_count"
  | "imported_by_count"
> {
  const identity = recordOf(envelope["identity"]);
  return {
    reachable:
      identity?.["is_reachable"] === true || identity?.["file_reachable"] === true,
    entry_point: identity?.["is_entry_point"] === true,
    used: identity?.["is_used"] === true,
    reason: textOf(identity, "reason"),
    export_count: numberOf(identity, "export_count") || exports,
    import_count: numberOf(identity, "import_count"),
    imported_by_count: numberOf(identity, "imported_by_count") || readers,
  };
}

export async function fallowInspect(
  file: string,
  symbol: string | undefined,
  root: string | undefined,
  limit: number,
): Promise<CodeSymbolInspectDetails> {
  const asked = (symbol ?? "").trim();
  const args =
    asked === ""
      ? ["inspect", "--file", file]
      : ["inspect", "--symbol", `${file}:${asked}`];
  const found = await fallow(args, root);
  const empty: CodeSymbolInspectDetails = {
    ...baseOf(found),
    path: file,
    symbol: asked,
    reachable: false,
    entry_point: false,
    used: false,
    reason: "",
    export_count: 0,
    import_count: 0,
    imported_by_count: 0,
    rows: [],
    hotspots: [],
    duplicates: 0,
  };

  if (found.envelope === null) return { ...empty, ...failedOf(found) };
  if (found.message !== "")
    return { ...empty, status: "empty", error: found.message };

  const evidence = recordOf(found.envelope["evidence"]);
  const trace = sectionOf(evidence, "trace_file").data;
  const complexity = sectionOf(evidence, "complexity").data;
  const duplication = sectionOf(evidence, "duplication").data;

  const exports = recordsOf(trace?.["exports"]).map(surfaceRowOf);
  const hotspots = recordsOf(complexity?.["findings"])
    .map(rowOfComplexity)
    .filter((row) => row.path === file || file.endsWith(row.path));
  const cap = Math.min(exports.length, Math.max(limit, 1));

  return {
    ...empty,
    status: exports.length === 0 && asked === "" ? "empty" : "ok",
    ...identityOf(found.envelope, exports.length, stringsOf(trace?.["imported_by"]).length),
    rows: exports.slice(0, cap),
    hotspots: metered(hotspots).slice(0, Math.max(limit, 1)),
    duplicates: numberOf(duplication, "matched_count"),
    omitted: Math.max(0, exports.length - cap),
    error: "",
  };
}



const referenceRowOf = (record: JsonRecord): ReferenceRow => ({
  name: firstText(textOf(record, "local_name"), textOf(record, "imported_as")),
  file: textOf(record, "file"),
  at: "",
  depth: numberOf(record, "depth"),
  type_only: record["type_only"] === true,
  via: textOf(record, "imported_as"),
});

export async function fallowTrace(
  target: string,
  root: string | undefined,
  depth: number,
  limit: number,
): Promise<CodeSymbolReferencesDetails> {
  const found = await fallow(["trace", target, "--depth", String(depth)], root);
  const [file = "", ...rest] = target.split(":");
  const empty: CodeSymbolReferencesDetails = {
    ...baseOf(found),
    file,
    symbol: rest.join(":"),
    found: false,
    best_effort: true,
    depth: depth || DEFAULT_TRACE_DEPTH,
    reason: "",
    caller_count: 0,
    callee_count: 0,
    unresolved_count: 0,
    callers: [],
    callees: [],
  };

  if (found.envelope === null) return { ...empty, ...failedOf(found) };
  if (found.message !== "")
    return { ...empty, status: "failed", error: found.message };

  const callers = recordsOf(found.envelope["callers"]).map(referenceRowOf);
  const callees = recordsOf(found.envelope["callees"]).map(referenceRowOf);
  const cap = Math.max(limit, 1);

  return {
    ...empty,
    status:
      found.envelope["symbol_found"] === false
        ? "empty"
        : callers.length + callees.length === 0
          ? "none"
          : "ok",
    found: found.envelope["symbol_found"] === true,
    best_effort: found.envelope["best_effort"] === true,
    depth: numberOf(found.envelope, "depth"),
    reason: textOf(found.envelope, "reason"),
    caller_count: callers.length,
    callee_count: callees.length,
    unresolved_count: listOf(found.envelope["unresolved_callees"]).length,
    callers: callers.slice(0, cap),
    callees: callees.slice(0, cap),
    omitted:
      Math.max(0, callers.length - cap) + Math.max(0, callees.length - cap),
    error: "",
  };
}
