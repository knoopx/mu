/**
 * Reading one file's text.
 *
 * Two endpoints, and the second only because the first gives up: the contents
 * endpoint carries the text as base64 up to about a megabyte and answers with a
 * size and no content above that, so a big file is read again off the raw host,
 * which holds it as itself. Bytes that are not text are refused, not painted.
 */

import { MAX_FILE_CHARS } from "../../../constants";
import { answered, bodyOf, fieldList, refused } from "../../call";
import type { GithubCall, GithubField } from "../../../types";
import { apiGet, encodePath, rawGet } from "../client";
import type { GithubReply } from "../client";
import {
  decodeContent,
  looksBinary,
  numberOf,
  recordOf,
  shortSha,
  sizeOf,
  stringOf,
} from "../record";
import {
  costsOf,
  needRepo,
  optionsOf,
  rawRef,
  refQuery,
  repoPath,
  refusedBy,
} from "./gate";
import type { GithubReadInput } from "./gate";
import type { GithubFound } from "../../call";

/**
 * Where a file is and how big it came out, as the answer says it.
 *
 * There is no `file` field: a path already ends in the name, and a table that
 * printed `file CHANGELOG.md` above `path CHANGELOG.md` spent two rows saying one
 * thing. The name is still read off the record where an error has to name the
 * file it refused to show.
 */
function fileFields(
  record: Record<string, unknown>,
  wanted: string,
  ref: string,
): GithubField[] {
  return fieldList([
    ["path", wanted],
    ["ref", ref === "" ? "(default)" : ref],
    ["size", sizeOf(record["size"])],
    ["sha", shortSha(stringOf(record["sha"]))],
  ]);
}

/** A file's text, and what reading it cost — the raw host only when the contents endpoint had no text to give. */
async function fileTextOf(
  record: Record<string, unknown>,
  reply: GithubReply,
  input: GithubReadInput,
  wanted: string,
): Promise<{ text: string | null; costs: GithubFound }> {
  const text = decodeContent(record["content"]);
  if (text !== null || numberOf(record["size"]) === 0)
    return { text, costs: costsOf(reply) };

  const raw = await rawGet(
    `${(input.owner ?? "").trim()}/${(input.repo ?? "").trim()}/${rawRef(input.ref)}/${encodePath(wanted)}`,
    optionsOf(input),
  );
  if (raw.status !== "ok") return { text: null, costs: costsOf(reply) };

  return {
    text: raw.text,
    costs: {
      cached: reply.cached || raw.cached,
      ms: reply.ms + raw.ms,
      rate: raw.rate,
    },
  };
}

export async function readFile(input: GithubReadInput): Promise<GithubCall> {
  const guard = needRepo(input, "file");
  if (guard.answer !== null) return guard.answer;
  const blank = guard.blank;
  const wanted = (input.path ?? "").trim();
  if (wanted === "") return refused(blank, "missing required parameter: path");

  const reply = await apiGet(
    `${repoPath(input.owner, input.repo)}/contents/${encodePath(wanted)}${refQuery(input.ref)}`,
    optionsOf(input),
  );
  const stop = refusedBy(reply, blank);
  if (stop !== null) return stop;

  if (Array.isArray(reply.json))
    return refused(blank, `${wanted} is a folder — github-tree lists it`);

  const record = recordOf(reply.json);
  const where = fileFields(record, wanted, blank.ref);
  const name = stringOf(record["name"], wanted.split("/").pop() ?? wanted);
  const size = sizeOf(record["size"]);
  const read = await fileTextOf(record, reply, input, wanted);

  if (read.text === null || looksBinary(read.text))
    return answered(
      blank,
      "binary",
      `${name}${size === "" ? "" : ` (${size})`} is not text — mu cannot show its bytes here`,
      { ...read.costs, fields: where },
    );

  const text = read.text;
  const clipped = bodyOf(text, MAX_FILE_CHARS);
  return answered(blank, text.trim() === "" ? "empty" : "ok", "", {
    ...read.costs,
    fields: [
      ...where,
      ...fieldList([["lines", String(text.split("\n").length)]]),
    ],
    body: clipped.body,
    bodyOmitted: clipped.omitted,
  });
}
