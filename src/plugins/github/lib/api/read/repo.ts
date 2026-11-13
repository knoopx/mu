/**
 * Reading one repository.
 *
 * One endpoint, one record: what the project is, how many people say so, and when
 * it last moved. The description is the one field written by a person rather than
 * counted by an API, so it travels as the call's body — a prose panel in the log,
 * a paragraph in the model's answer — and not as a field that repeats itself there.
 */

import { answered, bodyOf, fieldList } from "../../call";
import { MAX_BODY_CHARS } from "../../../constants";
import { costsOf, needRepo, optionsOf, refusedBy, repoPath } from "./gate";
import type { GithubReadInput } from "./gate";
import type { GithubCall } from "../../../types";
import { apiGet } from "../client";
import {
  dateOf,
  flagOf,
  licenseOf,
  numberOf,
  recordOf,
  sizeOf,
  stringOf,
  textOf,
  urlOf,
} from "../record";

export async function readRepo(input: GithubReadInput): Promise<GithubCall> {
  const { blank, answer } = needRepo(input, "repo");
  if (answer !== null) return answer;

  const reply = await apiGet(
    repoPath(input.owner, input.repo),
    optionsOf(input),
  );
  const stop = refusedBy(reply, blank);
  if (stop !== null) return stop;

  const record = recordOf(reply.json);
  const description = bodyOf(stringOf(record["description"]), MAX_BODY_CHARS);
  // `state` is only ever news: a repository that is archived or disabled. The
  // visibility a read of any repository already proves is not printed as a field
  // and not drawn as a figure.
  const state = flagOf(record["archived"])
    ? "archived"
    : flagOf(record["disabled"])
      ? "disabled"
      : "";

  return answered(blank, "ok", "", {
    ...costsOf(reply),
    body: description.body,
    bodyOmitted: description.omitted,
    fields: fieldList([
      ["stars", String(numberOf(record["stargazers_count"]))],
      ["forks", String(numberOf(record["forks_count"]))],
      ["language", stringOf(record["language"])],
      ["license", licenseOf(record["license"])],
      ["state", state],
      ["branch", stringOf(record["default_branch"])],
      ["open issues", String(numberOf(record["open_issues_count"]))],
      ["size", sizeOf(numberOf(record["size"]) * 1024)],
      ["pushed", dateOf(record["pushed_at"])],
      ["url", urlOf(record)],
    ]),
  });
}
