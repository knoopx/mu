/**
 * Turns a GitHub answer into what the transcript draws.
 *
 * The nine tools answer two audiences — `content` text in aligned columns for the
 * model, one `GithubCall` in `details` for the log — and this file is the only
 * reader of that shape. A session resumed this week holds JSON rather than a live
 * object, so every field is checked rather than trusted, and a call whose details
 * are not a GitHub call at all answers `null` so the log falls back to its generic
 * row.
 *
 * What is here is the frame every read shares: which kind's vocabulary answers,
 * what the read found, what the caps left out, and what it cost. What a folder, a
 * changeset, a thread or a profile is *drawn as* is each widget's own business —
 * one component per tool in `components/`.
 */

import { GITHUB_TOOL_NAMES } from "../constants";
import { listOf, numberOf, recordOf, stringOf } from "./api/record";
import { wordsOf } from "./kinds/vocabulary";
import type {
  GithubFact,
  GithubIdentity,
  GithubKindWords,
  GithubState,
} from "./kinds/contract";
import type {
  GithubCall,
  GithubField,
  GithubKind,
  GithubRow,
  GithubStatus,
} from "../types";

export interface GithubToolView {
  status: GithubStatus;
  call: GithubCall;

  /** the kind's own vocabulary: its figures, its empty words, how its body reads */
  words: GithubKindWords;

  /** how the card opens: what the record is called, what identifies it, whose face stands at its head */
  identity: GithubIdentity;

  /** the record's counts, formatted, in the order they are read */
  facts: GithubFact[];

  /** where the record stands, said once at the head of the card */
  state: GithubState | null;

  /** what the read listed, for the widget that draws it: a tree, a changeset, a thread, a hit list */
  rows: GithubRow[];

  /** a file's text or a body of prose, ready to paint */
  body: string;

  /** what a status means in words — the reason of a failure, the news of an empty read */
  note: string;

  /** listed rows the cap left out */
  omitted: number;
}

const KINDS: readonly string[] = [
  "repo",
  "file",
  "tree",
  "pr",
  "issue",
  "release",
  "releases",
  "commit",
  "search",
  "user",
];

const STATUSES: readonly string[] = [
  "ok",
  "empty",
  "failed",
  "unsupported",
  "binary",
];

const fieldOf = (value: unknown): GithubField | null => {
  const record = recordOf(value);
  const label = stringOf(record["label"]);
  const text = stringOf(record["value"]);
  if (label === "" || text === "") return null;
  return { label, value: text };
};

const rowOf = (value: unknown): GithubRow => {
  const record = recordOf(value);
  return {
    rank: numberOf(record["rank"]),
    name: stringOf(record["name"]),
    detail: stringOf(record["detail"]),
    state: stringOf(record["state"]),
    figure: stringOf(record["figure"]),
  };
};

/** The details of a GitHub call, or null when the answer is not one. */
export function githubCallOf(details: unknown): GithubCall | null {
  if (typeof details !== "object" || details === null) return null;
  const record = recordOf(details);
  const kind = stringOf(record["kind"]);
  const status = stringOf(record["status"]);
  if (!KINDS.includes(kind) || !STATUSES.includes(status)) return null;

  const rate = recordOf(record["rate"]);
  return {
    status: status as GithubStatus,
    kind: kind as GithubKind,
    repo: stringOf(record["repo"]),
    ref: stringOf(record["ref"]),
    path: stringOf(record["path"]),
    target: stringOf(record["target"]),
    query: stringOf(record["query"]),
    fields: listOf(record["fields"])
      .map(fieldOf)
      .filter((field): field is GithubField => field !== null),
    rows: listOf(record["rows"]).map(rowOf),
    omitted: numberOf(record["omitted"]),
    body: stringOf(record["body"]),
    bodyOmitted: numberOf(record["bodyOmitted"]),
    total: numberOf(record["total"]),
    cached: record["cached"] === true,
    ms: numberOf(record["ms"]),
    rate: {
      limit: numberOf(rate["limit"]),
      remaining: numberOf(rate["remaining"]),
    },
    error: stringOf(record["error"]),
  };
}

/** What a status means in words; an `ok` call has none. */
function noteOf(call: GithubCall, words: GithubKindWords): string {
  if (call.status === "empty") return words.emptyNote(call);
  if (call.status === "ok") return "";
  return call.error;
}

export function githubToolViewOf(
  name: string,
  _args: Record<string, unknown> | undefined,
  details: unknown,
  itemStatus: string,
): GithubToolView | null {
  if (!GITHUB_TOOL_NAMES.includes(name.toLowerCase())) return null;

  const call = githubCallOf(details);
  if (call === null) return null;

  const status: GithubStatus =
    itemStatus === "error" && call.status === "ok" ? "failed" : call.status;
  const withStatus = { ...call, status };
  const words = wordsOf(call.kind);

  return {
    status,
    call: withStatus,
    words,
    identity: words.identity(withStatus),
    facts: words.facts(withStatus),
    state: words.state(withStatus),
    rows: withStatus.rows,
    body: call.body,
    note: noteOf(withStatus, words),
    omitted: withStatus.omitted,
  };
}

/**
 * What a GitHub call's row looks like is the nine cards' business, not a header
 * line's: each card opens with the record it read, so there is no scope string to
 * build and no counts to repeat beside it.
 */
