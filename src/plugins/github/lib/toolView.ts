/**
 * Turns a GitHub answer into what the transcript draws.
 *
 * The nine tools answer two audiences — `content` text in aligned columns for
 * the model, one `GithubCall` in `details` for the log — and this file is the
 * only reader of that shape. A session resumed this week holds JSON rather than
 * a live object, so every field is checked rather than trusted, and a call whose
 * details are not a GitHub call at all answers `null` so the log falls back to
 * its generic row.
 */

import { counted, partsLine } from "../../core/lib/agent/toolText";
import type { ToolRowCell, ToolPaintRow } from "../../core/lib/ui/toolRowPaint";
import { GITHUB_TOOL_NAMES } from "../constants";
import { emptyNote, targetLabel, unitOf } from "./answer";
import { listOf, numberOf, recordOf, stringOf } from "./api/record";
import type { GithubCall, GithubField, GithubKind, GithubRow, GithubStatus } from "../types";

export interface GithubToolView {
  status: GithubStatus;
  call: GithubCall;

  /** the chips under the head: what the call was pointed at and what it cost */
  cells: ToolRowCell[];

  /** the one line above the rows: how much was read, or what the record is */
  headline: string;

  rows: ToolPaintRow[];

  /** a file's text or a prose body, ready to paint */
  body: string;

  /** what a status means in words — the reason of a failure, the news of an empty read */
  note: string;

  /** rows the cap left out */
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

const STATUSES: readonly string[] = ["ok", "empty", "failed", "unsupported", "binary"];

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
    rate: { limit: numberOf(rate["limit"]), remaining: numberOf(rate["remaining"]) },
    error: stringOf(record["error"]),
  };
}

const fieldNamed = (call: GithubCall, label: string): string =>
  call.fields.find((field) => field.label === label)?.value ?? "";

/** The rows a call answers with, in the shape the log draws: rank, body, state, figure.
 *
 * The id column holds the rank and nothing else. What kind of thing a row is
 * stands in the header and the scope chips already, so repeating it in every id
 * of a twenty-row list was twenty copies of one word in the column that should
 * be the narrowest in the table. */
function paintRows(call: GithubCall): ToolPaintRow[] {
  return call.rows.map((row, index) => ({
    key: String(row.rank === 0 ? index + 1 : row.rank),
    primary: row.name,
    secondary: row.detail,
    badge: row.state,
    trailing: row.figure,
  }));
}

/** What a call read, in the one line above its rows. */
function headlineOf(call: GithubCall): string {
  if (call.rows.length > 0) {
    const shown = counted(call.rows.length, unitOf(call.kind));
    if (call.kind === "search" && call.total > call.rows.length)
      return `${shown} of ${String(call.total)}`;
    return shown;
  }
  if (call.status !== "ok") return "";

  const named = fieldNamed(call, "title");
  if (named !== "") return partsLine(named, fieldNamed(call, "state"));

  if (call.kind === "repo")
    return partsLine(
      `${fieldNamed(call, "stars")} stars`,
      fieldNamed(call, "language"),
      fieldNamed(call, "branch") === ""
        ? ""
        : `default ${fieldNamed(call, "branch")}`,
    );

  if (call.kind === "file")
    return partsLine(fieldNamed(call, "size"), fieldNamed(call, "lines"));

  if (call.kind === "user")
    return partsLine(
      `${fieldNamed(call, "repos")} repos`,
      `${fieldNamed(call, "followers")} followers`,
    );

  if (call.kind === "commit")
    return partsLine(fieldNamed(call, "description"), fieldNamed(call, "changes"));

  if (call.kind === "release")
    return partsLine(fieldNamed(call, "state"), fieldNamed(call, "published"));

  return fieldNamed(call, "description");
}

/** The note a status has to say in words; an `ok` call has none. */
function noteOf(call: GithubCall): string {
  if (call.status === "empty") return emptyNote(call);
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

  const cells: ToolRowCell[] = [
    { label: "repo", value: call.repo },
    { label: targetLabel(call.kind), value: call.kind === "search" ? "" : call.target },
    { label: "query", value: call.query },
    { label: "ref", value: call.ref },
    { label: "path", value: call.path },
    { label: "read", value: call.cached ? "cached" : "live" },
    { label: "took", value: call.ms === 0 ? "" : `${String(call.ms)} ms` },
  ];

  return {
    status,
    call,
    cells,
    headline: headlineOf(call),
    rows: paintRows(call),
    body: call.body,
    note: noteOf({ ...call, status }),
    omitted: call.omitted,
  };
}
