/**
 * What every GitHub read needs before it asks anything.
 *
 * The scope a call was pointed at, the endpoint path that scope names, the guard
 * that refuses a repo-scoped call which was never given a repo, and the cost a
 * reply carried. The nine reads share all of this; none of it decides what an
 * answer *means*, which is each kind's own file.
 */

import { blankCall, refused } from "../../call";
import type { GithubBlank, GithubCall, GithubKind } from "../../../types";
import type { GithubReply, RequestOptions } from "../client";

/** What a read was asked for, as the tools pass it. */
export interface GithubReadInput {
  owner?: string;
  repo?: string;
  ref?: string;
  path?: string;
  number?: number;
  sha?: string;
  tag?: string;
  login?: string;
  query?: string;
  kind?: string;
  limit?: number;
  files?: boolean;
  refresh?: boolean;
  signal?: AbortSignal;
}

export const optionsOf = (input: GithubReadInput): RequestOptions => ({
  signal: input.signal,
  refresh: input.refresh,
});

/** `repos/owner/repo`, or empty when the call did not name both halves. */
export function repoPath(owner = "", repo = ""): string {
  const who = (owner ?? "").trim();
  const what = (repo ?? "").trim();
  if (who === "" || what === "") return "";
  return `repos/${encodeURIComponent(who)}/${encodeURIComponent(what)}`;
}

/** `owner/repo` in the words an error names it with. */
export const repoLabel = (input: GithubReadInput): string =>
  `${(input.owner ?? "").trim()}/${(input.repo ?? "").trim()}`;

/** The `?ref=` a ref asks for, and none when the caller left the default branch. */
export const refQuery = (ref = ""): string => {
  const wanted = (ref ?? "").trim();
  return wanted === "" ? "" : `?ref=${encodeURIComponent(wanted)}`;
};

/** The ref the raw host wants: whatever was asked for, or the repo's head. */
export const rawRef = (ref = ""): string =>
  (ref ?? "").trim() === "" ? "HEAD" : (ref ?? "").trim();

/** A repo-scoped call that was not given a repo is not a call worth making. */
export function needRepo(
  input: GithubReadInput,
  kind: GithubKind,
): { blank: GithubBlank; answer: GithubCall | null } {
  const blank = blankCall(kind, input);
  if (repoPath(input.owner, input.repo) !== "") return { blank, answer: null };
  return {
    blank,
    answer: refused(blank, "missing required parameters: owner and repo"),
  };
}

/** A `limit` a call may set, bounded by the plugin's own floor and ceiling. */
export function bounded(
  limit: number | undefined,
  fallback: number,
  max: number,
  min = 1,
): number {
  if (limit === undefined || !Number.isFinite(limit)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(limit)));
}

/** What a reply says it cost, carried into every answer that reads it. */
export const costsOf = (reply: GithubReply) => ({
  cached: reply.cached,
  ms: reply.ms,
  rate: reply.rate,
});

/** The answer a reply that is not `ok` already is, or null to keep reading. */
export function refusedBy(
  reply: GithubReply,
  blank: GithubBlank,
): GithubCall | null {
  if (reply.status === "ok") return null;
  return refused(blank, reply.error, reply.status);
}
