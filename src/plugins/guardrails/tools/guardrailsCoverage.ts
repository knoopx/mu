import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import {
  COVERAGE_DEFAULT_DAYS,
  GUARDRAILS_COVERAGE_TOOL,
  MAX_COVERAGE_FILES,
} from "../constants";
import type { PluginTool } from "../../core/lib/plugin/manifest";
import { defaultSessionsDir, guardrailCoverage } from "../lib/coverage";
import { reportSummary, reportTable, yesNo } from "../lib/report";
import { guardrailRules } from "../lib/rules";
import type { GuardrailsCallStatus, GuardrailsCoverageDetails } from "../types";

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

function readGuardrailCoverage(
  days?: number,
  sessions?: string,
): AgentToolResult<GuardrailsCoverageDetails> {
  const report = guardrailCoverage(sessions, days ?? COVERAGE_DEFAULT_DAYS);
  const never = report.rows.filter((row) => row.never).map((row) => row.domain);
  const caution = report.truncated
    ? `scan capped at ${MAX_COVERAGE_FILES} files — the counts are a floor`
    : "";
  const status: GuardrailsCallStatus =
    report.error !== null
      ? "failed"
      : report.rows.length === 0
        ? "empty"
        : "ok";

  const header =
    `guardrails-coverage · ${report.dir} · ` +
    (report.windowDays === 0 ? "every session" : `last ${report.windowDays}d`) +
    ` · ${report.files} ${report.files === 1 ? "file" : "files"}`;
  const note = [
    report.error,
    caution,
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
      ["domain", "blocks", "last", "never"],
      report.rows.map((row) => [
        row.domain,
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
    // `details` is what the log draws: the state once, the reason split from the
    // caution, and the rows. The text above stays the model's whole report.
    details: {
      status,
      dir: report.dir,
      error: report.error ?? "",
      files: report.files,
      windowDays: report.windowDays,
      ruleCount: guardrailRules().length,
      truncated: report.truncated,
      note: caution,
      rows: report.rows,
    },
  };
}

export const guardrailsCoverageTool: PluginTool<
  typeof CoverageParametersSchema,
  GuardrailsCoverageDetails
> = {
  name: GUARDRAILS_COVERAGE_TOOL,
  icon: "queryStats",
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
    "The rows are the domains the rule set holds today: a name no rule holds is not an answer about this rule set, so it is not reported.",
  ],

  executionMode: "parallel",
  parameters: CoverageParametersSchema,

  async execute(_toolCallId, params) {
    return readGuardrailCoverage(params.days, params.sessions);
  },
};
