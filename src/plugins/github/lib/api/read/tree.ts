/**
 * Listing one folder.
 *
 * The contents endpoint answers for a folder, and for a file path too — which is
 * the one confusion this read has to refuse rather than guess at. The entries
 * come back as GitHub names them: a name, a type, and a size only where a type
 * says a size means anything.
 */

import { MAX_TREE_ROWS } from "../../../constants";
import {
  answered,
  blankCall,
  fieldList,
  rankedRows,
  refused,
} from "../../call";
import type { GithubBlank, GithubCall } from "../../../types";
import { apiGet, encodePath } from "../client";
import type { GithubReply } from "../client";
import { listOf, recordOf, sizeOf, stringOf } from "../record";
import {
  costsOf,
  needRepo,
  optionsOf,
  refQuery,
  repoPath,
  refusedBy,
} from "./gate";
import type { GithubReadInput } from "./gate";

/** The contents endpoint, which answers for a folder and, given a file path, a file. */
async function contentsOf(
  input: GithubReadInput,
): Promise<{ reply: GithubReply; blank: GithubBlank }> {
  const blank = blankCall("tree", input);
  const folder = (input.path ?? "").trim();
  const path = `${repoPath(input.owner, input.repo)}/contents${folder === "" ? "" : `/${encodePath(folder)}`}${refQuery(input.ref)}`;
  return { reply: await apiGet(path, optionsOf(input)), blank };
}

export async function readTree(input: GithubReadInput): Promise<GithubCall> {
  const guard = needRepo(input, "tree");
  if (guard.answer !== null) return guard.answer;

  const { reply, blank } = await contentsOf(input);
  const stop = refusedBy(reply, blank);
  if (stop !== null) return stop;

  if (!Array.isArray(reply.json))
    return refused(
      blank,
      `${blank.path === "" ? "the repository root" : blank.path} is a file — github-file reads it`,
    );

  const listed = listOf(reply.json).map((item) => {
    const record = recordOf(item);
    const type = stringOf(record["type"], "file");
    return {
      name: stringOf(record["name"]),
      detail: stringOf(record["path"]),
      state: type,
      figure: type === "file" ? sizeOf(record["size"]) : "",
    };
  });
  const { rows, omitted } = rankedRows(listed, MAX_TREE_ROWS);

  return answered(blank, rows.length === 0 ? "empty" : "ok", "", {
    ...costsOf(reply),
    fields: fieldList([
      ["folder", blank.path === "" ? "(root)" : blank.path],
      ["ref", blank.ref === "" ? "(default)" : blank.ref],
      ["entries", String(listed.length)],
    ]),
    rows,
    omitted,
    total: listed.length,
  });
}
