/**
 * Entity-level change review.
 *
 * `inspect` scores every entity a change touched rather than every line of the
 * patch, so a review names the entities a change puts most at risk: the ones
 * with the widest blast radius and the most dependents. This file folds that
 * answer into rows worst-first, and scales each row's meter to the widest
 * blast radius in the same answer, so the log can draw it without knowing the
 * scale of the commit.
 */

import { runReview, scopeDir } from "./cli";
import {
  numberOf,
  parseEnvelope,
  recordOf,
  recordsOf,
  textOf,
  type JsonRecord,
} from "./json";
import { firstLine } from "../../../utils/truncate";
import type { CodeReviewDetails, QualityCount, RiskRow } from "../types";

const RISK_ORDER = ["critical", "high", "medium", "low"];

const riskRank = (risk: string): number => {
  const index = RISK_ORDER.indexOf(risk.toLowerCase());
  return index < 0 ? RISK_ORDER.length : index;
};

const rowOfReview = (record: JsonRecord): RiskRow => ({
  risk: textOf(record, "risk_level").toLowerCase(),
  entity: textOf(record, "entity_name"),
  type: textOf(record, "entity_type"),
  file: textOf(record, "file_path"),
  at: `${String(numberOf(record, "start_line"))}-${String(
    numberOf(record, "end_line"),
  )}`,
  score: numberOf(record, "risk_score"),
  blast: numberOf(record, "blast_radius"),
  dependents: numberOf(record, "dependent_count"),
  change: textOf(record, "change_type"),
  public_api: record["is_public_api"] === true,
  meter: { score: 0, worst: 0 },
});

/** Riskiest first, above the floor the call asked for, each meter scaled to the widest blast radius in the answer. */
function ranked(
  rows: readonly RiskRow[],
  minRisk: string | undefined,
): RiskRow[] {
  const floor = (minRisk ?? "any").toLowerCase();
  const kept =
    floor === "any"
      ? rows
      : rows.filter((row) => riskRank(row.risk) <= riskRank(floor));
  const sorted = [...kept].sort(
    (a, b) =>
      riskRank(a.risk) - riskRank(b.risk) ||
      b.score - a.score ||
      b.blast - a.blast,
  );
  const worst = sorted.reduce((top, row) => Math.max(top, row.blast), 0);
  return sorted.map((row) => ({ ...row, meter: { score: row.blast, worst } }));
}

const countsOf = (record: JsonRecord | null, key: string): QualityCount[] => {
  const group = recordOf(record?.[key]);
  return Object.entries(group ?? {})
    .filter(([, value]) => typeof value === "number" && value > 0)
    .map(([kind, count]) => ({ kind, count: count as number }));
};

/** The arguments of a diff review: JSON, the risk floor if there is one, the repo, the ref. */
const reviewArgs = (
  target: string,
  minRisk: string | undefined,
  dir: string,
): string[] => {
  const floor = (minRisk ?? "any").toLowerCase();
  return [
    "diff",
    "--format",
    "json",
    ...(floor === "any" ? [] : ["--min-risk", floor]),
    "-C",
    dir,
    target,
  ];
};

/** The shape of a review that never happened: the same fields, nothing changed. */
const emptyReview = (
  target: string,
  repo: string | undefined,
): CodeReviewDetails => ({
  analyzer: "inspect",
  target,
  repo: (repo ?? "").trim(),
  status: "ok",
  entities_changed: 0,
  risk_counts: [],
  change_counts: [],
  groups: 0,
  entities_in_graph: 0,
  rows: [],
  omitted: 0,
  elapsed_ms: 0,
  error: "",
});

export async function inspectDiff(
  target: string,
  repo: string | undefined,
  minRisk: string | undefined,
  limit: number,
): Promise<CodeReviewDetails> {
  const scope = scopeDir(repo);
  if (scope.error !== "")
    return {
      ...emptyReview(target, repo),
      status: "unsupported",
      error: scope.error,
    };

  const run = await runReview(
    reviewArgs(target, minRisk, scope.dir),
    scope.dir,
  );
  const envelope = parseEnvelope(run.stdout);
  if (envelope === null)
    return {
      ...emptyReview(target, repo),
      status: run.status === "ok" ? "failed" : run.status,
      error:
        run.error !== ""
          ? run.error
          : firstLine(run.stderr) || "the change analyser failed",
    };

  const stats = recordOf(envelope["stats"]);
  const timing = recordOf(envelope["timing"]);
  const rows = ranked(
    recordsOf(envelope["entity_reviews"]).map(rowOfReview),
    minRisk,
  );
  const shown = rows.slice(0, Math.max(limit, 1));

  return {
    ...emptyReview(target, repo),
    status: rows.length === 0 ? "none" : "ok",
    entities_changed: numberOf(stats, "total_entities"),
    risk_counts: countsOf(stats, "by_risk"),
    change_counts: countsOf(stats, "by_change_type"),
    groups: recordsOf(envelope["groups"]).length,
    entities_in_graph: numberOf(timing, "graph_entity_count"),
    rows: shown,
    omitted: Math.max(0, rows.length - shown.length),
    elapsed_ms: numberOf(timing, "total_ms"),
  };
}
