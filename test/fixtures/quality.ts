import {
  CODE_COMPLEXITY_TOOL,
  CODE_DUPLICATES_TOOL,
  GATE_NOTE,
} from "../../src/plugins/code-quality/constants";
import type {
  CodeComplexityDetails,
  CodeDuplicatesDetails,
} from "../../src/plugins/code-quality/types";
import {
  blocks,
  moreLine,
  statusTable,
  tableOf,
} from "../../src/plugins/core/lib/agent/toolText";
import { toolCallFixture, type ToolFixture } from "./tool";

export const QUALITY_ANSWER =
  "Thirty-eight functions sit over the thresholds and there is one clone family worth cutting: the analyser's rows in `code-quality/lib/toolResult.ts` are the same rows in `vcs/lib/toolResult.ts`, so the fix is one shared painter rather than another copy. Start with `useSessionTree.onKey` — its CRAP is high because one handler decides six things.";

/** The worst three of a project's complexity, as `code-complexity` ranks them. */
const COMPLEXITY_ROWS = [
  {
    path: "src/plugins/core/hooks/useSessionTree.ts",
    symbol: "onKey",
    at: "186:3",
    cyclomatic: 18,
    cognitive: 10,
    crap: 342,
    lines: 41,
    exceeded: "crap",
    severity: "high",
    fixable: false,
    meter: { score: 342, worst: 342 },
  },
  {
    path: "src/plugins/core/lib/agent/transcriptState.ts",
    symbol: "toolItems",
    at: "536:1",
    cyclomatic: 17,
    cognitive: 14,
    crap: 306,
    lines: 31,
    exceeded: "crap",
    severity: "high",
    fixable: false,
    meter: { score: 306, worst: 342 },
  },
  {
    path: "src/plugins/guardrails/lib/panelRows.ts",
    symbol: "guardrailPanelRows",
    at: "52:1",
    cyclomatic: 16,
    cognitive: 19,
    crap: 272,
    lines: 88,
    exceeded: "cognitive crap",
    severity: "moderate",
    fixable: false,
    meter: { score: 272, worst: 342 },
  },
];

const COMPLEXITY_DETAILS: CodeComplexityDetails = {
  analyzer: "fallow",
  version: "3.40.0",
  path: "",
  status: "ok",
  files_analyzed: 247,
  functions_analyzed: 2196,
  above_threshold: 38,
  thresholds: { cyclomatic: 20, cognitive: 15, crap: 30 },
  severity_counts: [
    { kind: "critical", count: 9 },
    { kind: "high", count: 12 },
    { kind: "moderate", count: 17 },
  ],
  rows: COMPLEXITY_ROWS,
  omitted: 35,
  elapsed_ms: 23,
  error: GATE_NOTE,
};

/** One clone family: the row helpers one plugin copied out of another. */
const DUPLICATE_ROWS = [
  {
    fingerprint: "dup:9b1c4e7a20f3",
    lines: 71,
    tokens: 412,
    spread: 4,
    instances: [
      {
        file: "src/plugins/code-quality/components/QualityRows.tsx",
        from: 119,
        to: 164,
      },
      { file: "src/plugins/vcs/components/VcsRows.tsx", from: 131, to: 201 },
    ],
    fixable: false,
  },
  {
    fingerprint: "dup:4ea70c18bd55",
    lines: 40,
    tokens: 208,
    spread: 4,
    instances: [
      { file: "src/plugins/code-quality/lib/toolResult.ts", from: 9, to: 44 },
      { file: "src/plugins/vcs/lib/toolResult.ts", from: 17, to: 56 },
    ],
    fixable: true,
  },
];

const DUPLICATES_DETAILS: CodeDuplicatesDetails = {
  analyzer: "fallow",
  version: "3.40.0",
  path: "",
  status: "ok",
  total_files: 226,
  files_with_clones: 9,
  total_lines: 33869,
  duplicated_lines: 461,
  duplication_percentage: 1.36,
  clone_groups: 11,
  clone_instances: 23,
  rows: DUPLICATE_ROWS,
  omitted: 9,
  elapsed_ms: 18,
  error: "",
};

export const QUALITY_COMPLEXITY_ITEM: ToolFixture = toolCallFixture(
  "call-quality-complexity",
  CODE_COMPLEXITY_TOOL,
  { limit: 3 },
  "ok",
  blocks(
    statusTable({
      scope: "(cwd)",
      functions: COMPLEXITY_DETAILS.functions_analyzed,
      above_threshold: COMPLEXITY_DETAILS.above_threshold,
      status: "ok",
    }),
    tableOf(
      COMPLEXITY_ROWS.map((row) => ({
        at: row.at,
        path: row.path,
        symbol: row.symbol,
        cc: row.cyclomatic,
        cognitive: row.cognitive,
        crap: row.crap,
        lines: row.lines,
        exceeded: row.exceeded,
        severity: row.severity,
      })),
    ),
    moreLine(COMPLEXITY_DETAILS.omitted, "finding"),
    "38 functions of 2196 analyzed is over the thresholds (CC 20, cognitive 15, CRAP 30).",
  ),
  { details: COMPLEXITY_DETAILS },
);

export const QUALITY_DUPES_ITEM: ToolFixture = toolCallFixture(
  "call-quality-dupes",
  CODE_DUPLICATES_TOOL,
  {},
  "ok",
  blocks(
    statusTable({
      scope: "(cwd)",
      files: DUPLICATES_DETAILS.total_files,
      duplicated_lines: "461 of 33869",
      duplication: "1.36%",
      status: "ok",
    }),
    tableOf([
      {
        fingerprint: "dup:9b1c4e7a20f3",
        lines: 71,
        tokens: 412,
        instances: 2,
        spread: 4,
      },
    ]),
    "  src/plugins/code-quality/components/QualityRows.tsx:119-164",
    "  src/plugins/vcs/components/VcsRows.tsx:131-201",
    moreLine(DUPLICATES_DETAILS.omitted, "clone group"),
    "11 clone groups · 1.36% duplicated",
  ),
  { details: DUPLICATES_DETAILS },
);
