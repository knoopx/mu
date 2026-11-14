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
 * what the read found, what the caps left out, what it cost, and the one line the
 * tool header shows. What a folder, a changeset, a thread or a profile is *drawn
 * as* is each widget's own business — one component per tool in `components/`.
 */

import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import type { ToolRowCell } from "../../core/lib/ui/toolRowPaint";
import {
  headerLineOf,
  toolPreviewLine,
  type ToolPreviewVocabulary,
} from "../../core/lib/agent/toolPreview";
import { GITHUB_TOOL_KINDS, GITHUB_TOOL_NAMES } from "../constants";
import { listOf, numberOf, recordOf, stringOf } from "./api/record";
import { wordsOf } from "./kinds/vocabulary";
import type {
  GithubFact,
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
    facts: words.facts(withStatus),
    state: words.state(withStatus),
    rows: withStatus.rows,
    body: call.body,
    note: noteOf(withStatus, words),
    omitted: withStatus.omitted,
  };
}

/**
 * The one line the tool header shows.
 *
 * The card below says what came back, so the header says what the call was pointed
 * at — the file, number, sha, tag, login or the words typed, and the repository they
 * were named in — and then only what the card has nowhere else to say it: a file's
 * length and the line its body stops at, trailing along the header's width. A count
 * the card prints under its own name is never on the header as well. The words while
 * a read runs and the words of an empty one come from the
 * kind's own vocabulary, the same nine files the card reads, so a header and a
 * card cannot drift into saying two different things about one call.
 */

/** The nine tools, each speaking in the words of the kind it reads. */
const headerTable = (
  pick: (words: GithubKindWords) => string,
): Record<string, string> =>
  Object.fromEntries(
    GITHUB_TOOL_NAMES.map((tool) => [
      tool,
      pick(wordsOf(GITHUB_TOOL_KINDS[tool] ?? "repo")),
    ]),
  );

// A GitHub row says what it was pointed at and what came back on one line, so the
// vocabulary carries no `empty`/`stated` table here: those words ride the scope, and
// the card below is left to the record's own content.
const HEADER_WORDS: ToolPreviewVocabulary = {
  running: headerTable((words) => words.running),
  runningDefault: "reading GitHub",
  clean: [],
  empty: {},
  emptyDefault: "nothing found",
  stated: {},
};

/** What the call was pointed at, and the repository it named it in. */
function scopeOf(_tool: string, view: GithubToolView): string {
  const call = view.call;
  // A search names words rather than a record, and names the kind of record it
  // wants alongside them; every other read names one thing inside a repository.
  const named =
    call.query === ""
      ? call.path === ""
        ? call.target
        : call.path
      : `“${call.query}”`;
  const kind = call.query === "" ? "" : call.target;
  const where = call.ref === "" ? call.repo : `${call.repo}@${call.ref}`;
  const what = [named, kind].filter((part) => part !== "").join(" ");
  if (where === "") return what;
  return what === "" ? where : `${what} in ${where}`;
}

/** What the status adds to the scope, in the few words a header line carries. */
function statusWord(view: GithubToolView): string {
  if (view.status === "empty") return view.words.emptyShort;
  if (view.status === "binary") return "binary file";
  if (view.status === "unsupported") return "no answer from GitHub";
  return "";
}

/**
 * The record's figures ride the header as chips: what a repository is written in, how
 * many people say so, who wrote a commit and when it landed. They are the call's own
 * measurements rather than its answer, so the card below keeps the content — the
 * description, the changes, the thread, the file's text.
 */
export function githubChipsOf(
  item: ToolTranscriptItem,
): readonly ToolRowCell[] {
  const view = githubToolViewOf(
    item.name,
    item.args,
    item.details,
    item.status,
  );
  if (view === null) return [];
  return view.facts.map((fact) => ({ label: fact.label, value: fact.value }));
}

/**
 * The header's line: what the call was pointed at, what came back when it was, and
 * then the counts no card shows. The card holds content — text, rows, prose — never
 * the identity or the standing of the call, because that is this line's job.
 */
function headerOf(tool: string, view: GithubToolView): string {
  const scope = scopeOf(tool, view);
  const named = view.words.title(view.call);
  // The record's own name — a commit subject, an issue title, a release name — joins
  // this line rather than opening a second heading in the card. When it is only what
  // the scope already said, it is not said twice.
  const head = named === "" || named === scope ? scope : `${scope} · ${named}`;
  return headerLineOf(head, [
    view.state === null ? "" : view.state.word,
    statusWord(view),
    ...view.words.headerFacts(view.call),
  ]);
}

export const githubToolPreviewOf = (item: ToolTranscriptItem): string =>
  toolPreviewLine(
    item,
    githubToolViewOf(item.name, item.args, item.details, item.status),
    HEADER_WORDS,
    headerOf,
  );
