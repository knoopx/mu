import type {
  ToolPaintSection,
  ToolRowCell,
  ToolRowMeter,
} from "../core/lib/ui/toolRowPaint";

export type QualityToolStatus =
  "ok" | "failed" | "unsupported" | "empty" | "none";

/** A chip of what the call read — the shared row shape, under this plugin's name. */
export type QualityCell = ToolRowCell;

export interface QualityCount {
  kind: string;
  count: number;
}

export type QualityMeter = ToolRowMeter;

export interface CodeComplexityParams {
  path?: string;
  limit?: number;
  sort?: "score" | "complexity" | "file";
}

export interface ComplexityRow {
  path: string;
  symbol: string;
  at: string;
  cyclomatic: number;
  cognitive: number;
  crap: number;
  lines: number;
  exceeded: string;
  severity: string;
  fixable: boolean;
  meter: QualityMeter;
}

/**
 * What every analyser answer carries, whatever it read: which analyser ran, how
 * it went, how much it left out, and why it failed. The figures each tool adds
 * are its own interface's, and the log's fold reads the shared four through
 * this name — so a field the fold needs cannot be missing from one tool's answer
 * while the fold still asks for it.
 */
export interface QualityAnswer {
  analyzer: string;
  status: QualityToolStatus;
  omitted: number;
  error: string;
}

export interface CodeComplexityDetails extends QualityAnswer {
  version: string;
  path: string;
  files_analyzed: number;
  functions_analyzed: number;
  above_threshold: number;
  thresholds: {
    cyclomatic: number;
    cognitive: number;
    crap: number;
  };
  severity_counts: QualityCount[];
  rows: ComplexityRow[];
  omitted: number;
  elapsed_ms: number;
  error: string;
}

export interface DeadCodeRow {
  kind: string;
  path: string;
  symbol: string;
  at: string;
  severity: string;
  fixable: boolean;
}

export interface CodeDeadCodeParams {
  path?: string;
  limit?: number;
  scope?: "all" | "files" | "exports" | "types" | "members" | "deps";
}

export interface CodeDeadCodeDetails extends QualityAnswer {
  version: string;
  path: string;
  total_issues: number;
  entry_points: number;
  counts: QualityCount[];
  rows: DeadCodeRow[];
  omitted: number;
  elapsed_ms: number;
  error: string;
}

export interface DuplicateInstance {
  file: string;
  from: number;
  to: number;
}

export interface DuplicateRow {
  fingerprint: string;
  lines: number;
  tokens: number;
  spread: number;
  instances: DuplicateInstance[];
  fixable: boolean;
}

export interface CodeDuplicatesParams {
  path?: string;
  limit?: number;
}

export interface CodeDuplicatesDetails extends QualityAnswer {
  version: string;
  path: string;
  total_files: number;
  files_with_clones: number;
  total_lines: number;
  duplicated_lines: number;
  duplication_percentage: number;
  clone_groups: number;
  clone_instances: number;
  rows: DuplicateRow[];
  omitted: number;
  elapsed_ms: number;
  error: string;
}

export interface RiskRow {
  risk: string;
  entity: string;
  type: string;
  file: string;
  at: string;
  score: number;
  blast: number;
  dependents: number;
  change: string;
  public_api: boolean;
  meter: QualityMeter;
}

export interface CodeReviewParams {
  target: string;
  repo?: string;
  min_risk?: "any" | "low" | "medium" | "high" | "critical";
  limit?: number;
}

export interface CodeReviewDetails extends QualityAnswer {
  target: string;
  repo: string;
  entities_changed: number;
  risk_counts: QualityCount[];
  change_counts: QualityCount[];
  groups: number;
  entities_in_graph: number;
  rows: RiskRow[];
  omitted: number;
  elapsed_ms: number;
  error: string;
}

export interface SurfaceRow {
  name: string;
  kind: string;
  consumers: number;
  at: string;
  type_only: boolean;
}

export interface CodeSymbolInspectParams {
  path: string;
  symbol?: string;
  root?: string;
  limit?: number;
}

export interface CodeSymbolInspectDetails extends QualityAnswer {
  version: string;
  path: string;
  symbol: string;
  reachable: boolean;
  entry_point: boolean;
  used: boolean;
  reason: string;
  export_count: number;
  import_count: number;
  imported_by_count: number;
  rows: SurfaceRow[];
  hotspots: ComplexityRow[];
  duplicates: number;
  omitted: number;
  error: string;
}

export interface ReferenceRow {
  name: string;
  file: string;
  at: string;
  depth: number;
  type_only: boolean;
  via: string;
}

export interface CodeSymbolReferencesParams {
  symbol: string;
  path?: string;
  root?: string;
  depth?: number;
  limit?: number;
}

export interface CodeSymbolReferencesDetails extends QualityAnswer {
  version: string;
  file: string;
  symbol: string;
  found: boolean;
  best_effort: boolean;
  depth: number;
  reason: string;
  caller_count: number;
  callee_count: number;
  unresolved_count: number;
  callers: ReferenceRow[];
  callees: ReferenceRow[];
  omitted: number;
  elapsed_ms: number;
  error: string;
}

export interface QualityToolView {
  tool: string;
  status: QualityToolStatus | "";
  headline: string;
  cells: QualityCell[];
  sections: ToolPaintSection[];
  omitted: number;
  note: string;
}
