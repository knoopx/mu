/**
 * What one kind of GitHub call says about itself.
 *
 * Nine kinds read nine endpoints, and none of them is a table. A folder is a
 * tree, a pull request is a diffstat, a thread is a thread, a profile is a
 * profile — so each kind keeps one file that says what its record *is*: how it is
 * named on the line that opens its card, which counts it is worth (each one
 * formatted the way a reader says it — `6 Nov`, `47k`, `7 replies` — never the
 * wire's text), where it stands, and how its body reads. `lib/kinds/vocabulary.ts`
 * is the only table that knows all nine.
 */

import type { IconName } from "adwaita-gpuix";
import type { GithubCall, GithubRow } from "../../types";

/** How a call's body reads in the log: a file's text as code, prose as markdown, or nothing at all. */
export type GithubBodyKind = "code" | "prose" | "none";

/** Where a record stands, and the tone it is read in. */
export interface GithubState {
  word: string;
  tone: "good" | "bad" | "warn" | "plain";
}

/** One count of a record: the figure, and the word for it underneath it. */
export interface GithubFact {
  label: string;
  value: string;
  /** the value is a number, so it stands in mono and holds one format */
  figure?: boolean;
  /** the number is news, so it wears the colour that says so */
  tone?: "good" | "bad" | "warn";
}

/** How a record opens its card: the name GitHub gives it, and what it sits in. */
export interface GithubIdentity {
  title: string;
  /** the path, sha or number the record is known by under its name */
  secondary: string;
  icon?: IconName;
  /** whose face stands at the head of the card */
  person?: string;
}

export interface GithubKindWords {
  /** what one row of this kind's list is called, in the model's count line */
  unit: string;

  /** the word for the thing a call names in the model's scope table — `pr`, `tag`, `login`; "" when it names nothing of its own */
  target: string;

  /** what the tool says while the read is still going */
  running: string;

  /** what an empty answer means in a header, in the few words a tool name can carry beside it */
  emptyShort: string;

  /** what an empty read of this kind means, in the words that say what was looked at */
  emptyNote(call: GithubCall): string;

  /** the columns one row answers in, in the model's table — read off the call, never guessed from the row's shape */
  columns(call: GithubCall, row: GithubRow): Record<string, string>;

  /** the record's own words, on the line above everything it drew: a title, a subject, a bio, a description */
  title(call: GithubCall): string;

  /** how the card opens: what the record is called, and what it is identified by */
  identity(call: GithubCall): GithubIdentity;

  /** the counts this kind is worth, formatted, in the order they are read */
  facts(call: GithubCall): GithubFact[];

  /** where the record stands, said once on the far side of its title; null when it has no standing */
  state(call: GithubCall): GithubState | null;

  /** how this kind's body reads */
  body: GithubBodyKind;
}

/** One field of the record, read by the label the read named it with. */
export const fieldNamed = (call: GithubCall, label: string): string =>
  call.fields.find((field) => field.label === label)?.value ?? "";

/** One count of a record, with the word that says what it counts. */
export const fact = (
  label: string,
  value: string,
  opts: { figure?: boolean; tone?: "good" | "bad" | "warn" } = {},
): GithubFact => ({ label, value, ...opts });

/**
 * How a record opens when it has no name of its own: what the call was pointed at,
 * with the repository it lives in as the line under it.
 */
export const identityOf = (
  call: GithubCall,
  title: string,
  icon: IconName,
  secondary = "",
  person = "",
): GithubIdentity => ({
  title: title === "" ? call.repo : title,
  secondary: secondary === "" ? (title === "" ? "" : call.repo) : secondary,
  icon,
  person,
});

/** Counts read in order, with the ones the record does not have dropped. */
export const factsShown = (facts: readonly GithubFact[]): GithubFact[] =>
  facts.filter((item) => item.value !== "");

/**
 * The tone a state word is read in. An open request and a closed one are not the
 * same colour, and the colour is the only thing doing that work — the word is
 * already the word.
 */
/** The state a record carries under this label, in the tone that word is read in. */
export const stateOf = (
  call: GithubCall,
  label: string = "state",
): GithubState | null => {
  const word = fieldNamed(call, label);
  return word === "" ? null : { word, tone: stateTone(word) };
};

export const stateTone = (state: string): "good" | "bad" | "warn" | "plain" => {
  const word = state.trim().toLowerCase();
  if (
    word.startsWith("merged") ||
    word.startsWith("open") ||
    word.startsWith("released")
  )
    return "good";
  if (
    word.startsWith("closed") ||
    word.startsWith("archived") ||
    word.startsWith("disabled")
  )
    return "bad";
  if (word.startsWith("draft") || word.startsWith("prerelease")) return "warn";
  return "plain";
};

/**
 * A row's cells, keyed by the column names this kind uses.
 *
 * A column with nothing in it is dropped rather than printed empty: a table of
 * forty rows with a blank `was` column is one column of nothing, and the row's
 * own record still says the file was not renamed.
 */
export function cells(
  row: GithubRow,
  entries: readonly (readonly [string, string])[],
): Record<string, string> {
  const out: Record<string, string> = {};
  if (row.rank > 0) out["rank"] = String(row.rank);
  for (const [column, value] of entries) if (value !== "") out[column] = value;
  return out;
}

/**
 * The columns of a list whose rows the kind has no word of its own for: what a
 * row is called, what stands under it, where it stands, and its figure.
 *
 * A record read on its own — a repository, a file, a profile — lists only what
 * the log already draws as its figures, so its table takes the plain shape.
 */
export const recordColumns = (
  _call: GithubCall,
  row: GithubRow,
): Record<string, string> =>
  cells(row, [
    ["name", row.name],
    ["detail", row.detail],
    ["state", row.state],
    ["figure", row.figure],
  ]);

/**
 * The columns of a changeset: the file, what happened to it, how much moved, and
 * what it was called before.
 *
 * A commit and a pull request move the same rows, and the one number that tells
 * a reader which of the two they are looking at is the file's own count.
 */
export const changesetColumns = (
  _call: GithubCall,
  row: GithubRow,
): Record<string, string> =>
  cells(row, [
    ["file", row.name],
    ["status", row.state],
    ["changes", row.figure],
    ["was", row.detail],
  ]);

/**
 * The mark a kind's card opens with. One mark per kind, never one per fact: the
 * counts underneath name themselves.
 */
export const kindIcon = (kind: string): IconName => {
  if (kind === "file") return "description";
  if (kind === "tree") return "folder-open";
  if (kind === "pr") return "merge";
  if (kind === "commit") return "commit";
  if (kind === "issue") return "forum";
  if (kind === "release" || kind === "releases") return "sell";
  if (kind === "search") return "search";
  if (kind === "user") return "person";
  return "code";
};
