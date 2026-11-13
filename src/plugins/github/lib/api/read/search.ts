/**
 * Running one GitHub search.
 *
 * Five kinds sit behind one read because the endpoint differs only by its last
 * segment; what genuinely differs is what a hit *is* — a repository, a path, an
 * issue, a commit, a login — and that is spelled out per kind here. Code and
 * commit search are signed-in reads at GitHub, so mu says so before it asks
 * rather than taking a 401 and calling it a failure of the call.
 */

import {
  AUTH_ONLY_SEARCH_KINDS,
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  SEARCH_KINDS,
} from "../../../constants";
import {
  answered,
  blankCall,
  fieldList,
  rankedRows,
  refused,
} from "../../call";
import type { GithubCall } from "../../../types";
import { apiGet, hasToken, queryOf, TOKEN_HINT } from "../client";
import {
  listOf,
  loginOf,
  nested,
  numberOf,
  recordOf,
  shortSha,
  stringOf,
  textOf,
} from "../record";
import { bounded, costsOf, optionsOf, refusedBy } from "./gate";
import type { GithubReadInput } from "./gate";

/** The search endpoint a kind reads, empty for a kind mu does not offer. */
const searchEndpoint = (kind: string): string =>
  (SEARCH_KINDS as readonly string[]).includes(kind) ? `search/${kind}` : "";

/** What one hit of each search kind looks like. */
function searchRow(kind: string, item: Record<string, unknown>) {
  const repo = stringOf(nested(item["repository"])["full_name"]);

  if (kind === "code")
    return {
      name: stringOf(item["path"]),
      detail: repo,
      state: "",
      figure: "",
    };

  if (kind === "issues")
    return {
      name: textOf(item["title"], 120),
      detail:
        repo === ""
          ? `#${String(numberOf(item["number"]))}`
          : `${repo}#${String(numberOf(item["number"]))}`,
      state: stringOf(item["state"], "open"),
      figure: `${String(numberOf(item["comments"]))} comments`,
    };

  if (kind === "commits")
    return {
      name: shortSha(stringOf(item["sha"])),
      detail: textOf(nested(item["commit"])["message"], 120),
      state: repo,
      figure: loginOf(nested(item["author"])),
    };

  if (kind === "users")
    return {
      name: stringOf(item["login"]),
      detail: textOf(item["bio"], 120),
      state: stringOf(item["type"]),
      figure: `${String(numberOf(item["public_repos"]))} repos · ${String(numberOf(item["followers"]))} followers`,
    };

  return {
    name: stringOf(item["full_name"]),
    detail: textOf(item["description"]),
    state: stringOf(item["language"]),
    figure: `${String(numberOf(item["stargazers_count"]))} stars`,
  };
}

export async function readSearch(input: GithubReadInput): Promise<GithubCall> {
  const query = (input.query ?? "").trim();
  const kind = (input.kind ?? "repositories").trim().toLowerCase();
  const blank = blankCall("search", { ...input, target: kind });
  if (query === "") return refused(blank, "missing required parameter: query");

  const endpoint = searchEndpoint(kind);
  if (endpoint === "")
    return refused(
      blank,
      `unknown search kind: ${kind} — mu offers ${SEARCH_KINDS.join(", ")}`,
    );

  if (AUTH_ONLY_SEARCH_KINDS.includes(kind) && !hasToken())
    return refused(
      blank,
      `${kind} search needs a signed-in read: ${TOKEN_HINT}`,
      "unsupported",
    );

  const limit = bounded(input.limit, DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT);
  const reply = await apiGet(
    `${endpoint}?${queryOf({ q: query, per_page: limit })}`,
    optionsOf(input),
  );
  const stop = refusedBy(reply, blank);
  if (stop !== null) return stop;

  const record = recordOf(reply.json);
  const listed = listOf(record["items"]).map((item) =>
    searchRow(kind, recordOf(item)),
  );
  const { rows, omitted } = rankedRows(listed, limit);

  return answered(blank, rows.length === 0 ? "empty" : "ok", "", {
    ...costsOf(reply),
    fields: fieldList([
      ["kind", kind],
      ["total", String(numberOf(record["total_count"]))],
      ["shown", String(rows.length)],
    ]),
    rows,
    omitted,
    total: numberOf(record["total_count"]),
  });
}
