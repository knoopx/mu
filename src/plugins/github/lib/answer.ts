/**
 * What a GitHub call says to the model.
 *
 * A call answers two readers at once: aligned columns in `content`, and the same
 * facts structured in `details` for the log. This file is the first of those, and
 * it is the frame only — the scope table, the record's fields, the list's rows,
 * the body, and the note about what the caps left out. Which columns a row
 * answers in, what one of its rows is called, and what an empty read means are
 * the kind's own words, in `lib/kinds/`.
 */

import {
  blocks,
  moreLine,
  statusTable,
  tableOf,
} from "../../core/lib/agent/toolText";
import type { GithubCall } from "../types";
import { wordsOf } from "./kinds/vocabulary";

/** The header row: what the call was pointed at, and how the read ended. */
function scopeTable(call: GithubCall): string {
  const words = wordsOf(call.kind);
  const scope: Record<string, string> = {};
  if (call.repo !== "") scope["repo"] = call.repo;
  if (words.target !== "" && call.target !== "")
    scope[words.target] = call.target;
  if (call.ref !== "") scope["ref"] = call.ref;
  if (call.path !== "") scope["path"] = call.path;
  scope["status"] = call.status;
  return statusTable(scope);
}

/** The fields of one resource, one per line, in the order the read named them. */
const fieldsTable = (call: GithubCall): string =>
  tableOf(
    call.fields.map((field) => ({ field: field.label, value: field.value })),
  );

/** One list, in the columns its kind uses. */
const rowsTable = (call: GithubCall): string => {
  const words = wordsOf(call.kind);
  return tableOf(call.rows.map((row) => words.columns(call, row)));
};

/** What the caps left out, so a short answer says so rather than looking short. */
function omissionNote(call: GithubCall): string {
  const parts = [
    moreLine(call.omitted, wordsOf(call.kind).unit),
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

  if (call.status === "binary")
    return blocks(head, call.error, fieldsTable(call));

  if (call.status === "empty")
    return blocks(head, wordsOf(call.kind).emptyNote(call));

  return blocks(
    head,
    fieldsTable(call),
    rowsTable(call),
    call.body,
    omissionNote(call),
  );
}
