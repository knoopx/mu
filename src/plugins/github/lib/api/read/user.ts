/**
 * Reading one profile.
 *
 * A user or an organisation, its own record with no repository around it, so no
 * repo guard runs and the only thing a call must name is the login.
 */

import { answered, blankCall, bodyOf, fieldList, refused } from "../../call";
import type { GithubCall } from "../../../types";
import { apiGet } from "../client";
import {
  dateOnlyOf,
  numberOf,
  recordOf,
  stringOf,
  textOf,
  urlOf,
} from "../record";
import { MAX_BODY_CHARS } from "../../../constants";
import { costsOf, optionsOf, refusedBy } from "./gate";
import type { GithubReadInput } from "./gate";

export async function readUser(input: GithubReadInput): Promise<GithubCall> {
  const login = (input.login ?? "").trim();
  const blank = blankCall("user", { ...input, target: login });
  if (login === "") return refused(blank, "missing required parameter: login");

  const reply = await apiGet(
    `users/${encodeURIComponent(login)}`,
    optionsOf(input),
  );
  const stop = refusedBy(reply, blank);
  if (stop !== null) return stop;

  const record = recordOf(reply.json);
  // A bio is prose the account wrote about itself, so it travels as the call's body
  // rather than as a field labelled `bio`: the row puts it in the prose panel, and a
  // field and a body carrying the same sentence is one sentence twice.
  const bio = bodyOf(stringOf(record["bio"]), MAX_BODY_CHARS);

  return answered(blank, "ok", "", {
    ...costsOf(reply),
    body: bio.body,
    bodyOmitted: bio.omitted,
    fields: fieldList([
      ["login", stringOf(record["login"], login)],
      ["name", textOf(record["name"])],
      ["type", stringOf(record["type"])],
      ["company", textOf(record["company"])],
      ["location", textOf(record["location"])],
      ["repos", String(numberOf(record["public_repos"]))],
      ["gists", String(numberOf(record["public_gists"]))],
      ["followers", String(numberOf(record["followers"]))],
      ["following", String(numberOf(record["following"]))],
      ["joined", dateOnlyOf(record["created_at"])],
      ["url", urlOf(record)],
    ]),
  });
}
