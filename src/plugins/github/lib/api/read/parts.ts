/**
 * The parts a record answer is built from.
 *
 * A pull request, an issue, a release and a commit all answer as one record with
 * prose beside it, and several of them read a second endpoint for their list of
 * rows. These are the pieces those four share: the numbered guard a thread is
 * read through, the fields a thread says about itself, the record half of an
 * answer, and a second endpoint's rows folded into an answer already under way.
 * What each kind puts in its own fields stays in its own file.
 */

import { bodyOf, blankCall, rankedRows, refused } from "../../call";
import type { GithubFound, GithubRowDraft } from "../../call";
import { MAX_BODY_CHARS } from "../../../constants";
import type {
  GithubBlank,
  GithubCall,
  GithubField,
  GithubKind,
} from "../../../types";
import { apiGet } from "../client";
import type { GithubReply } from "../client";
import {
  countsOf,
  dateOf,
  listOf,
  loginOf,
  numberOf,
  recordOf,
  stringOf,
  textOf,
} from "../record";
import { costsOf, needRepo, optionsOf, repoPath } from "./gate";
import type { GithubReadInput } from "./gate";

/**
 * A numbered read. A pull request and an issue are one number in one repository
 * and, at GitHub, one endpoint apiece with the same shape of answer, so the
 * guard, the number, the scope and any answer that is already a refusal settle
 * here; what a tool makes of the record is its own business.
 */
export async function numberedOf(
  input: GithubReadInput,
  kind: GithubKind,
): Promise<
  | { answer: GithubCall }
  | { blank: GithubBlank; reply: GithubReply; number: number }
> {
  const guard = needRepo(input, kind);
  if (guard.answer !== null) return { answer: guard.answer };

  const number = Math.max(1, Math.floor(numberOf(input.number)));
  const blank = blankCall(kind, { ...input, target: `#${String(number)}` });
  const endpoint = kind === "pr" ? "pulls" : "issues";
  const reply = await apiGet(
    `${repoPath(input.owner, input.repo)}/${endpoint}/${String(number)}`,
    optionsOf(input),
  );
  if (reply.status !== "ok")
    return { answer: refused(blank, reply.error, reply.status) };

  return { blank, reply, number };
}

/** What a pull request and an issue both say about themselves. */
export function sharedFields(
  record: Record<string, unknown>,
): (readonly [string, string])[] {
  return [
    ["title", textOf(record["title"])],
    ["author", loginOf(record["user"])],
    ["created", dateOf(record["created_at"])],
  ];
}

/**
 * The record half of an answer: its fields, plus the prose body GitHub keeps
 * beside them (`body` on a pull request, an issue and a release alike), cut to
 * the budget a tool may spend on context.
 */
export function recordFound(
  reply: GithubReply,
  record: Record<string, unknown>,
  fields: GithubField[],
): GithubFound {
  const body = bodyOf(stringOf(record["body"]), MAX_BODY_CHARS);
  return {
    ...costsOf(reply),
    fields,
    body: body.body,
    bodyOmitted: body.omitted,
  };
}

/**
 * A second endpoint's list, folded into an answer already built: the rows, how
 * many the cap left out, and the cost of the extra call added to the first.
 */
export function foldRows(
  found: GithubFound,
  reply: GithubReply,
  listed: readonly GithubRowDraft[],
  cap: number,
  total = listed.length,
): GithubFound {
  const ranked = rankedRows(listed, cap);
  return {
    ...found,
    rows: ranked.rows,
    omitted: ranked.omitted,
    total,
    ms: (found.ms ?? 0) + reply.ms,
    cached: found.cached === true || reply.cached,
  };
}

/** One changed file of a commit or a pull request. */
export function fileRow(item: unknown): GithubRowDraft {
  const file = recordOf(item);
  return {
    name: stringOf(file["filename"]),
    detail: stringOf(file["previous_filename"]),
    state: stringOf(file["status"], "modified"),
    figure: countsOf(file["additions"], file["deletions"]),
  };
}
