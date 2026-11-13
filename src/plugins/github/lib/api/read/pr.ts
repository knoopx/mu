/**
 * Reading one pull request.
 *
 * The record says what was proposed, between which two branches, and whether it
 * landed. The changed files are a second endpoint a caller has to ask for, so
 * the listing is folded into an answer already built and its cost added to the
 * first call's.
 */

import { MAX_PR_FILES } from "../../../constants";
import { answered, fieldList } from "../../call";
import type { GithubCall } from "../../../types";
import { apiGet, queryOf } from "../client";
import {
  countsOf,
  dateOf,
  flagOf,
  listOf,
  nested,
  numberOf,
  recordOf,
  stringOf,
  urlOf,
} from "../record";
import { optionsOf, repoPath } from "./gate";
import type { GithubReadInput } from "./gate";
import {
  fileRow,
  foldRows,
  numberedOf,
  recordFound,
  sharedFields,
} from "./parts";

export async function readPull(input: GithubReadInput): Promise<GithubCall> {
  const read = await numberedOf(input, "pr");
  if ("answer" in read) return read.answer;

  const { blank, reply, number } = read;
  const record = recordOf(reply.json);
  const merged = stringOf(record["merged_at"]);
  const state = flagOf(record["draft"])
    ? "draft"
    : merged === ""
      ? stringOf(record["state"], "open").toLowerCase()
      : "merged";

  const fields = fieldList([
    ["pr", `#${String(numberOf(record["number"], number))}`],
    ...sharedFields(record),
    ["state", state],
    ["head", stringOf(nested(record["head"])["label"])],
    ["base", stringOf(nested(record["base"])["label"])],
    ["commits", String(numberOf(record["commits"]))],
    ["changes", countsOf(record["additions"], record["deletions"])],
    ["files", String(numberOf(record["changed_files"]))],
    ["merged", merged === "" ? "" : dateOf(record["merged_at"])],
    ["url", urlOf(record)],
  ]);
  let found = recordFound(reply, record, fields);

  if (input.files === true) {
    const files = await apiGet(
      `${repoPath(input.owner, input.repo)}/pulls/${String(number)}/files?${queryOf({ per_page: MAX_PR_FILES })}`,
      optionsOf(input),
    );
    if (files.status === "ok")
      found = foldRows(
        found,
        files,
        listOf(files.json).map(fileRow),
        MAX_PR_FILES,
      );
  }

  return answered(blank, "ok", "", found);
}
