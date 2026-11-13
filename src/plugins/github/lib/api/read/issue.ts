/**
 * Reading one issue, and the thread under it.
 *
 * A pull request lives at the issue endpoint too, so the first thing this read
 * does is tell the caller to use `github-pr` rather than answer a pull request as
 * an issue with no comments. Comments are a second endpoint, and only the ones
 * asked for are fetched — which is the same news to a reader as a cap.
 */

import { DEFAULT_COMMENT_LIMIT, MAX_COMMENT_LIMIT } from "../../../constants";
import { answered, fieldList, refused } from "../../call";
import type { GithubCall } from "../../../types";
import { apiGet, queryOf } from "../client";
import {
  dateOf,
  labelsOf,
  listOf,
  loginOf,
  nested,
  numberOf,
  recordOf,
  stringOf,
  textOf,
  urlOf,
} from "../record";
import { bounded, optionsOf, repoLabel, repoPath } from "./gate";
import type { GithubReadInput } from "./gate";
import { foldRows, numberedOf, recordFound, sharedFields } from "./parts";

export async function readIssue(input: GithubReadInput): Promise<GithubCall> {
  const read = await numberedOf(input, "issue");
  if ("answer" in read) return read.answer;

  const { blank, reply, number } = read;
  const base = repoPath(input.owner, input.repo);
  const record = recordOf(reply.json);
  if (Object.keys(nested(record["pull_request"])).length > 0)
    return refused(
      blank,
      `#${String(number)} of ${repoLabel(input)} is a pull request — github-pr reads it`,
    );

  const state = [
    stringOf(record["state"], "open").toLowerCase(),
    stringOf(record["state_reason"]),
  ]
    .filter((word) => word !== "")
    .join(" ");

  const fields = fieldList([
    ["issue", `#${String(numberOf(record["number"], number))}`],
    ...sharedFields(record),
    ["state", state],
    ["closed", dateOf(record["closed_at"])],
    ["labels", labelsOf(record["labels"])],
    ["comments", String(numberOf(record["comments"]))],
    ["url", urlOf(record)],
  ]);
  let found = recordFound(reply, record, fields);

  const wanted = bounded(
    input.limit,
    DEFAULT_COMMENT_LIMIT,
    MAX_COMMENT_LIMIT,
    0,
  );
  if (wanted > 0 && numberOf(record["comments"]) > 0) {
    const comments = await apiGet(
      `${base}/issues/${String(number)}/comments?${queryOf({ per_page: wanted })}`,
      optionsOf(input),
    );
    if (comments.status === "ok") {
      const listed = listOf(comments.json).map((item) => {
        const comment = recordOf(item);
        return {
          name: loginOf(comment["user"]),
          detail: textOf(comment["body"]),
          state: "",
          figure: dateOf(comment["created_at"]),
        };
      });
      const total = numberOf(record["comments"]);
      found = {
        ...foldRows(found, comments, listed, wanted, total),
        // the rest of the thread was never fetched, which is the same news to a reader
        omitted: Math.max(0, total - listed.length),
      };
    }
  }

  return answered(blank, "ok", "", found);
}
