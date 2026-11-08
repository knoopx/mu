/**
 * What a GitHub call says to the model.
 *
 * A call answers two readers at once: aligned columns in `content`, and the same
 * facts structured in `details` for the log. This file is the first of those. A
 * record reads as a `field / value` table because the fields of a pull request
 * are too many to line up across a row; a list reads as a table of its kind's own
 * columns, so a folder listing says `name type size path` and an issue search
 * says `title state repo comments`; and a body — a file's text, a PR's
 * description — follows as itself, after the tables, where newlines survive.
 */

import { blocks, moreLine, statusTable, tableOf } from "../../core/lib/agent/toolText";
import type { GithubCall, GithubKind, GithubRow } from "../types";

/** What one kind of list calls its rows, in the note that counts them. */
export const unitOf = (kind: GithubKind): string => {
  if (kind === "tree") return "entry";
  if (kind === "releases") return "release";
  if (kind === "commit" || kind === "pr") return "file";
  if (kind === "issue") return "comment";
  return "result";
};

/** The empty answer of each kind, in the words that say what was looked at. */
export function emptyNote(call: GithubCall): string {
  if (call.kind === "tree")
    return `${call.path === "" ? call.repo : call.path} has no entries`;
  if (call.kind === "search")
    return `no ${call.target} matches ${call.query === "" ? "(empty query)" : `“${call.query}”`}`;
  if (call.kind === "releases") return `${call.repo} publishes no releases`;
  if (call.kind === "file") return `${call.path} is an empty file`;
  return "nothing to report";
}

/** The header row: what the call was pointed at, and how the read ended. */
function scopeTable(call: GithubCall): string {
  const scope: Record<string, string> = {};
  if (call.repo !== "") scope["repo"] = call.repo;
  if (call.kind === "search") scope["query"] = call.query;
  else if (call.target !== "") scope[targetLabel(call.kind)] = call.target;
  if (call.ref !== "") scope["ref"] = call.ref;
  if (call.path !== "") scope["path"] = call.path;
  if (call.kind === "search") scope["kind"] = call.target;
  scope["status"] = call.status;
  return statusTable(scope);
}

/** What the named thing of a call is called: a PR, an issue, a tag, a commit. */
export const targetLabel = (kind: GithubKind): string => {
  if (kind === "pr") return "pr";
  if (kind === "issue") return "issue";
  if (kind === "release" || kind === "releases") return "tag";
  if (kind === "commit") return "commit";
  if (kind === "search") return "kind";
  if (kind === "user") return "login";
  return "target";
};

/** The fields of one resource, one per line, in the order the read named them. */
const fieldsTable = (call: GithubCall): string =>
  tableOf(
    call.fields.map((field) => ({ field: field.label, value: field.value })),
  );

/** One row of a list, in the columns its kind uses. */
function rowCells(call: GithubCall, row: GithubRow): Record<string, string> {
  const cells: Record<string, string> = {};
  if (row.rank > 0) cells["rank"] = String(row.rank);

  if (call.kind === "tree") {
    cells["name"] = row.name;
    cells["type"] = row.state;
    cells["size"] = row.figure;
    cells["path"] = row.detail;
    return cells;
  }
  if (call.kind === "releases") {
    cells["name"] = row.name;
    cells["tag"] = row.detail;
    cells["state"] = row.state;
    cells["published"] = row.figure;
    return cells;
  }
  if (call.kind === "commit" || call.kind === "pr") {
    cells["file"] = row.name;
    cells["status"] = row.state;
    cells["changes"] = row.figure;
    if (row.detail !== "") cells["was"] = row.detail;
    return cells;
  }
  if (call.kind === "issue") {
    cells["author"] = row.name;
    cells["wrote"] = row.detail;
    cells["at"] = row.figure;
    return cells;
  }
  if (call.kind === "search") return searchCells(call.target, row);

  cells["name"] = row.name;
  cells["detail"] = row.detail;
  cells["state"] = row.state;
  cells["figure"] = row.figure;
  return cells;
}

/** The columns each search kind answers in. */
function searchCells(kind: string, row: GithubRow): Record<string, string> {
  const cells: Record<string, string> = {};
  if (row.rank > 0) cells["rank"] = String(row.rank);

  if (kind === "code") {
    cells["path"] = row.name;
    cells["repo"] = row.detail;
    return cells;
  }
  if (kind === "issues") {
    cells["title"] = row.name;
    cells["state"] = row.state;
    cells["where"] = row.detail;
    cells["comments"] = row.figure;
    return cells;
  }
  if (kind === "commits") {
    cells["sha"] = row.name;
    cells["message"] = row.detail;
    cells["repo"] = row.state;
    cells["author"] = row.figure;
    return cells;
  }
  if (kind === "users") {
    cells["login"] = row.name;
    cells["bio"] = row.detail;
    cells["type"] = row.state;
    cells["counts"] = row.figure;
    return cells;
  }
  cells["repo"] = row.name;
  cells["description"] = row.detail;
  cells["language"] = row.state;
  cells["stars"] = row.figure;
  return cells;
}

const rowsTable = (call: GithubCall): string =>
  tableOf(call.rows.map((row) => rowCells(call, row)));

/** The body, as itself: a file's text, or the prose of a PR, issue or release. */
const bodyBlock = (call: GithubCall): string => call.body;

/** What the caps left out, so a short answer says so rather than looking short. */
function omissionNote(call: GithubCall): string {
  const parts = [
    moreLine(call.omitted, unitOf(call.kind)),
    call.bodyOmitted <= 0
      ? ""
      : `… ${String(call.bodyOmitted)} more characters of the body not shown`,
  ];
  return parts.filter((part) => part !== "").join("\n");
}

/** The whole answer: the scope, what was found, and what was left out. */
export function githubAnswerOf(call: GithubCall): string {
  const head = scopeTable(call);

  if (call.status === "failed" || call.status === "unsupported")
    return blocks(head, call.error);

  if (call.status === "binary") return blocks(head, call.error, fieldsTable(call));

  if (call.status === "empty") return blocks(head, emptyNote(call));

  return blocks(
    head,
    fieldsTable(call),
    rowsTable(call),
    bodyBlock(call),
    omissionNote(call),
  );
}

