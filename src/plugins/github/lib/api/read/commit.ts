/**
 * Reading one commit.
 *
 * The record is the message and its author; the files it moved ride along on the
 * same endpoint, so unlike a pull request there is nothing to ask a second time.
 * A multi-line message carries its body as prose; a one-line subject is already
 * the whole of it and gets no body of its own.
 */

import { MAX_BODY_CHARS, MAX_COMMIT_FILES } from "../../../constants";
import { answered, bodyOf, fieldList, rankedRows, refused } from "../../call";
import type { GithubCall } from "../../../types";
import { apiGet } from "../client";
import {
  countsOf,
  dateOf,
  listOf,
  loginOf,
  nested,
  recordOf,
  shortSha,
  stringOf,
  textOf,
  urlOf,
} from "../record";
import { costsOf, needRepo, optionsOf, repoPath, refusedBy } from "./gate";
import type { GithubReadInput } from "./gate";
import { fileRow } from "./parts";

export async function readCommit(input: GithubReadInput): Promise<GithubCall> {
  const guard = needRepo(input, "commit");
  if (guard.answer !== null) return guard.answer;
  const sha = (input.sha ?? "").trim();
  if (sha === "")
    return refused(guard.blank, "missing required parameter: sha");

  const reply = await apiGet(
    `${repoPath(input.owner, input.repo)}/commits/${encodeURIComponent(sha)}`,
    optionsOf(input),
  );
  const stop = refusedBy(reply, guard.blank);
  if (stop !== null) return stop;

  const record = recordOf(reply.json);
  const commit = nested(record["commit"]);
  const author = nested(commit["author"]);
  const stats = nested(record["stats"]);
  const full = stringOf(commit["message"]);
  const subject = full.split("\n")[0] ?? "";
  const named = loginOf(record["author"]);
  const message = full.includes("\n")
    ? bodyOf(full, MAX_BODY_CHARS)
    : { body: "", omitted: 0 };

  const listed = listOf(record["files"]).map(fileRow);
  const { rows, omitted } = rankedRows(listed, MAX_COMMIT_FILES);

  return answered(guard.blank, "ok", "", {
    ...costsOf(reply),
    fields: fieldList([
      ["commit", shortSha(stringOf(record["sha"], sha))],
      ["description", textOf(subject)],
      [
        "author",
        `${stringOf(author["name"])}${named === "" ? "" : ` (${named})`}`.trim(),
      ],
      ["date", dateOf(author["date"])],
      ["changes", countsOf(stats["additions"], stats["deletions"])],
      ["files", String(listed.length)],
      ["url", urlOf(record)],
    ]),
    rows,
    omitted,
    body: message.body,
    bodyOmitted: message.omitted,
    total: listed.length,
  });
}
