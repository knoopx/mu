

import type {
  ToolPaintRow,
  ToolRowCell,
  ToolRowMeter,
} from "../core/lib/ui/toolRowPaint";

export type QualityToolStatus =
  | "ok"
  | "failed"
  | "unsupported"
  | "empty"
  | "none";


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

export interface CodeComplexityDetails {
  analyzer: string;
  version: string;
  path: string;
  status: QualityToolStatus;
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

export interface CodeDeadCodeDetails {
  analyzer: string;
  version: string;
  path: string;
  status: QualityToolStatus;
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

export interface CodeDuplicatesDetails {
  analyzer: string;
  version: string;
  path: string;
  status: QualityToolStatus;
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

export interface CodeReviewDetails {
  analyzer: string;
  target: string;
  repo: string;
  status: QualityToolStatus;
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

export interface CodeSymbolInspectDetails {
  analyzer: string;
  version: string;
  path: string;
  symbol: string;
  status: QualityToolStatus;
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

export interface CodeSymbolReferencesDetails {
  analyzer: string;
  version: string;
  file: string;
  symbol: string;
  status: QualityToolStatus;
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
  error: string;
}




export interface QualitySection {
  title: string;
  rows: readonly ToolPaintRow[];
}





export interface QualityToolView {
  tool: string;
  status: QualityToolStatus | "";
  headline: string;
  cells: QualityCell[];
  sections: QualitySection[];
  omitted: number;
  note: string;
}
