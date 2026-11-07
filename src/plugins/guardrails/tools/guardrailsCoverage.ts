import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import {
  COVERAGE_DEFAULT_DAYS,
  GUARDRAILS_COVERAGE_TOOL,
  MAX_COVERAGE_FILES,
} from "../constants";
import { defaultSessionsDir, guardrailCoverage } from "../lib/coverage";
import { reportSummary, reportTable, yesNo } from "../lib/report";
import { guardrailRules } from "../lib/rules";
import type { GuardrailsCoverageDetails } from "../types";

const CoverageParametersSchema = Type.Object({
  days: Type.Optional(
    Type.Number({
      minimum: 0,
      maximum: 3650,
      description: `Day window over session files by modification time (default ${COVERAGE_DEFAULT_DAYS}; 0 scans every session)`,
    }),
  ),
  sessions: Type.Optional(
    Type.String({
      minLength: 1,
      pattern: "^\\s*\\S",
      description: `Session directory to scan (\`~\` expands). Defaults to ${defaultSessionsDir()}`,
    }),
  ),
});

export function readGuardrailCoverage(
  days?: number,
  sessions?: string,
): AgentToolResult<GuardrailsCoverageDetails> {
  const report = guardrailCoverage(sessions, days ?? COVERAGE_DEFAULT_DAYS);
  const never = report.rows.filter((row) => row.never).map((row) => row.domain);

  const header =
    `guardrails-coverage · ${report.dir} · ` +
    (report.windowDays === 0 ? "every session" : `last ${report.windowDays}d`) +
    ` · ${report.files} ${report.files === 1 ? "file" : "files"}`;
  const note = [
    report.error,
    report.truncated
      ? `scan capped at ${MAX_COVERAGE_FILES} files — the counts are a floor`
      : "",
    report.rows.length === 0
      ? "no rules — nothing has had a chance to fire"
      : "",
    never.length > 0
      ? `never triggered: ${never.join(", ")} — ${
          never.length === 1 ? "it is" : "they are"
        } unproven against real work`
      : "",
  ]
    .filter((line) => line !== null && line !== "")
    .join("\n");

  const text = [
    header,
    note,
    reportTable(
      ["domain", "source", "blocks", "last", "never"],
      report.rows.map((row) => [
        row.domain,
        row.source,
        String(row.blocks),
        row.last,
        yesNo(row.never),
      ]),
    ),
    reportSummary([
      ["domains", report.rows.length],
      ["rules", guardrailRules().length],
      ["never", never.length],
      ["files", report.files],
      ["window", `${report.windowDays}d`],
    ]),
  ]
    .filter((block) => block !== "")
    .join("\n\n");

  return {
    content: [{ type: "text", text }],
    details: {
      dir: report.dir,
      files: report.files,
      windowDays: report.windowDays,
      ruleCount: guardrailRules().length,
      truncated: report.truncated,
      note: [
        report.error,
        report.truncated
          ? `scan capped at ${MAX_COVERAGE_FILES} files — the counts are a floor`
          : "",
        report.rows.length === 0
          ? "no rules — nothing has had a chance to fire"
          : "",
      ]
        .filter((line) => line !== null && line !== "")
        .join("\n"),
      rows: report.rows,
    },
  };
}

export const guardrailsCoverageTool: ToolDefinition<
  typeof CoverageParametersSchema,
  GuardrailsCoverageDetails
> = {
  name: GUARDRAILS_COVERAGE_TOOL,
  label: "guardrails coverage",
  description:
    "Reports which guardrail domains fired in recent sessions and which never did, by reading " +
    "the block reasons saved in session transcripts. Counts are observed blocks only — tool " +
    "results that open with the reason, not prose that quotes it — with a per-domain block count, " +
    "the last time it fired, and a never-triggered flag. A domain that has not fired in a window " +
    "of real work is unproven: rare, or quietly wrong.",
  promptSnippet:
    "Report which guardrail domains blocked in recent sessions and which never did",
  promptGuidelines: [
    "Run guardrails-coverage before trusting a rule set: a domain with zero blocks over a week of sessions is a rule nothing has tested against real work.",
    "`days=0` scans every saved session; the default window keeps the report about current work.",
    "A `legacy` row is a domain that fired in an old session and is no longer a rule — a rule that was dropped quietly shows up here.",
  ],

  executionMode: "parallel",
  parameters: CoverageParametersSchema,

  async execute(_toolCallId, params) {
    return readGuardrailCoverage(params.days, params.sessions);
  },
};
