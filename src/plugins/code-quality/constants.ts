import type { BadgeVariant } from "adwaita-gpuix";

export const CODE_COMPLEXITY_TOOL = "code-complexity";
export const CODE_DEAD_CODE_TOOL = "code-dead-code";
export const CODE_DUPLICATES_TOOL = "code-duplicates";
export const CODE_REVIEW_TOOL = "code-review";
export const CODE_SYMBOL_INSPECT_TOOL = "code-symbol-inspect";
export const CODE_SYMBOL_REFERENCES_TOOL = "code-symbol-references";

export const CODE_QUALITY_TOOL_NAMES: readonly string[] = [
  CODE_COMPLEXITY_TOOL,
  CODE_DEAD_CODE_TOOL,
  CODE_DUPLICATES_TOOL,
  CODE_REVIEW_TOOL,
  CODE_SYMBOL_INSPECT_TOOL,
  CODE_SYMBOL_REFERENCES_TOOL,
];

/** How a finding's badge is painted: what is worst, what is only worth a second look. */
export const QUALITY_BADGE_VARIANTS: Readonly<Record<string, BadgeVariant>> = {
  critical: "destructive",
  high: "warning",
  widespread: "warning",
  unused: "warning",
  type: "secondary",
  low: "secondary",
  deleted: "secondary",
};

export const RUNNER_BINARY = "bunx";
export const FALLOW_BINARY = "fallow";
export const REVIEW_BINARY = "inspect";

export const JSON_FORMAT = "-f";
export const JSON_VALUE = "json";

export const GATE_NOTE = "the analyser's gate failed — findings exist";

export const ANALYSER_TIMEOUT_MS = 120_000;

export const DEFAULT_FINDING_LIMIT = 25;
export const MAX_FINDING_LIMIT = 200;

export const DEFAULT_TRACE_DEPTH = 2;
export const MAX_TRACE_DEPTH = 5;
