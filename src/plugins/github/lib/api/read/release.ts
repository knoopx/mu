/**
 * Reading releases: the recent ones, or the one a tag names.
 *
 * Two shapes in one read because one parameter decides them. With no tag the
 * answer is a list of what a project has published; with one it is a single
 * record with its notes as the body, and the list's own caps do not apply.
 */

import { DEFAULT_RELEASE_LIMIT, MAX_RELEASE_LIMIT } from "../../../constants";
import { answered, blankCall, fieldList, rankedRows } from "../../call";
import type { GithubCall } from "../../../types";
import { apiGet, queryOf } from "../client";
import {
  dateOf,
  dateOnlyOf,
  flagOf,
  listOf,
  loginOf,
  recordOf,
  stringOf,
  textOf,
  urlOf,
} from "../record";
import {
  bounded,
  costsOf,
  needRepo,
  optionsOf,
  repoPath,
  refusedBy,
} from "./gate";
import type { GithubReadInput } from "./gate";
import { recordFound } from "./parts";

/** The word a release answers with: a pre-release, a draft, or nothing at all. */
const releaseState = (
  record: Record<string, unknown>,
  listed: string,
): string =>
  flagOf(record["prerelease"])
    ? "prerelease"
    : flagOf(record["draft"])
      ? "draft"
      : listed;

export async function readRelease(input: GithubReadInput): Promise<GithubCall> {
  const guard = needRepo(input, "release");
  if (guard.answer !== null) return guard.answer;

  const base = repoPath(input.owner, input.repo);
  const tag = (input.tag ?? "").trim();
  const blank = blankCall(tag === "" ? "releases" : "release", {
    ...input,
    target: tag,
  });

  if (tag === "") {
    const limit = bounded(
      input.limit,
      DEFAULT_RELEASE_LIMIT,
      MAX_RELEASE_LIMIT,
    );
    const reply = await apiGet(
      `${base}/releases?${queryOf({ per_page: limit })}`,
      optionsOf(input),
    );
    const stop = refusedBy(reply, blank);
    if (stop !== null) return stop;

    const listed = listOf(reply.json).map((item) => {
      const record = recordOf(item);
      return {
        name: stringOf(record["name"]) || stringOf(record["tag_name"]),
        detail: stringOf(record["tag_name"]),
        state: releaseState(record, ""),
        figure: dateOnlyOf(record["published_at"]),
      };
    });
    const { rows, omitted } = rankedRows(listed, limit);

    return answered(blank, rows.length === 0 ? "empty" : "ok", "", {
      ...costsOf(reply),
      fields: fieldList([["releases", String(listed.length)]]),
      rows,
      omitted,
      total: listed.length,
    });
  }

  const reply = await apiGet(
    `${base}/releases/tags/${encodeURIComponent(tag)}`,
    optionsOf(input),
  );
  const stop = refusedBy(reply, blank);
  if (stop !== null) return stop;

  const record = recordOf(reply.json);
  const fields = fieldList([
    ["tag", stringOf(record["tag_name"], tag)],
    ["name", textOf(record["name"])],
    ["state", releaseState(record, "released")],
    ["published", dateOf(record["published_at"])],
    ["author", loginOf(record["author"])],
    ["assets", String(listOf(record["assets"]).length)],
    ["url", urlOf(record)],
  ]);

  return answered(blank, "ok", "", recordFound(reply, record, fields));
}
