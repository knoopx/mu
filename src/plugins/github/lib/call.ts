/**
 * The one place an answer is assembled.
 *
 * A call names its scope once and then either fills in what it found or answers
 * with why it did not, and both branches have to carry every field of the shape
 * or the log paints a half-answer. So the blank scope is built here, the single
 * writer folds a status and a finding into it, and the ranking and text budgets
 * that decide what an answer holds are here too.
 */

import type {
  GithubBlank,
  GithubCall,
  GithubField,
  GithubKind,
  GithubRate,
  GithubRow,
  GithubScope,
  GithubStatus,
} from "../types";

const NO_RATE: GithubRate = { limit: 0, remaining: 0 };

/** `cli/cli` from the owner and repo a call named; a bare owner when there is no repo. */
const repoName = (owner = "", repo = ""): string => {
  const who = owner.trim();
  const what = repo.trim();
  if (what === "") return who;
  return who === "" ? what : `${who}/${what}`;
};

/** The scope of a call, with nothing resolved in it yet. */
export function blankCall(kind: GithubKind, scope: GithubScope): GithubBlank {
  return {
    kind,
    repo: repoName(scope.owner, scope.repo),
    ref: (scope.ref ?? "").trim(),
    path: (scope.path ?? "").trim(),
    target: (scope.target ?? "").trim(),
    query: (scope.query ?? "").trim(),
  };
}

/** What a read found, as far as it got. */
export interface GithubFound {
  fields?: GithubField[];
  rows?: GithubRow[];
  omitted?: number;
  body?: string;
  bodyOmitted?: number;
  total?: number;
  cached?: boolean;
  ms?: number;
  rate?: GithubRate;
}

/**
 * The single writer of a `GithubCall`. A failure answers with the same shape as
 * a success — empty fields, empty rows, empty body — so a view never has to
 * wonder whether a field exists.
 */
export function answered(
  blank: GithubBlank,
  status: GithubStatus,
  error: string,
  found: GithubFound = {},
): GithubCall {
  return {
    ...blank,
    status,
    fields: found.fields ?? [],
    rows: found.rows ?? [],
    omitted: found.omitted ?? 0,
    body: found.body ?? "",
    bodyOmitted: found.bodyOmitted ?? 0,
    total: found.total ?? 0,
    cached: found.cached ?? false,
    ms: found.ms ?? 0,
    rate: found.rate ?? NO_RATE,
    error,
  };
}

/** A call refused before GitHub was reached: a missing parameter, a missing token. */
export const refused = (
  blank: GithubBlank,
  error: string,
  status: GithubStatus = "failed",
): GithubCall => answered(blank, status, error);

/** The fields of a record, in the order they are named, empty ones skipped. */
export function fieldList(
  entries: readonly (readonly [string, string | number | undefined])[],
): GithubField[] {
  const fields: GithubField[] = [];
  for (const [label, value] of entries) {
    const text = String(value ?? "").trim();
    if (text !== "") fields.push({ label, value: text });
  }
  return fields;
}

/** A row without its position, as a read writes it before the ranking. */
export type GithubRowDraft = Omit<GithubRow, "rank">;

/**
 * Number the rows and cut the list at the cap. The count that fell off travels
 * in `omitted` so the answer can say so rather than look short.
 */
export function rankedRows(
  rows: readonly GithubRowDraft[],
  cap: number,
): { rows: GithubRow[]; omitted: number } {
  const kept = rows.slice(0, cap).map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
  return { rows: kept, omitted: Math.max(0, rows.length - kept.length) };
}

/** Text cut to its budget, with the characters that fell off. */
export function bodyOf(
  text: string,
  max: number,
): { body: string; omitted: number } {
  const trimmed = text.trim();
  if (trimmed.length <= max) return { body: trimmed, omitted: 0 };
  return { body: trimmed.slice(0, max), omitted: trimmed.length - max };
}
