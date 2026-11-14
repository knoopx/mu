/**
 * The verbs a tool performs on the store.
 *
 * Writing a program is the same four steps whatever tool asks for it — hold the
 * source, parse it against this app's library, put it in the log, answer with
 * what the parse said — so it is written once here and a tool only chooses the
 * words around it.
 */

import { MAX_PROGRAM_CHARS } from "../../constants";
import type { OpenUIProgramDetails } from "../../types";
import { emptySource, sourceTooBig } from "../answer";
import { parseProgram } from "../analysis/parse";
import { dropRuntime } from "../analysis/run";
import { answerSheet } from "../answer/store";
import { programStore, type ProgramRecord } from "./store";

export interface ProgramWriteOutcome {
  record: ProgramRecord;
  details: OpenUIProgramDetails;
  /** What the call should say instead of a body, when the write did not happen. */
  error: string;
  replaced: boolean;
  evicted: string[];
}

const errorDetails = (
  name: string,
  error: string,
  status: OpenUIProgramDetails["status"],
): OpenUIProgramDetails => ({
  status,
  error,
  ok: false,
  name,
  chars: 0,
  chunkChars: 0,
  statements: 0,
  components: 0,
  unresolved: [],
  diagnostics: [],
  incomplete: false,
  streaming: false,
  live: false,
  drawn: false,
  waiting: 0,
  queries: [],
});

/** Replace a program's whole source, or say why the source cannot be held. */
export function writeProgram(
  name: string,
  source: string,
  toolCallId: string,
  opts: { streaming?: boolean; activate?: boolean } = {},
): ProgramWriteOutcome {
  const text = source ?? "";
  if (text.trim() === "") {
    const error = emptySource();
    return {
      record: programStore.get(name) ?? ({} as ProgramRecord),
      details: errorDetails(name, error, "failed"),
      error,
      replaced: false,
      evicted: [],
    };
  }
  if (text.length > MAX_PROGRAM_CHARS) {
    const error = sourceTooBig(text.length, MAX_PROGRAM_CHARS);
    return {
      record: programStore.get(name) ?? ({} as ProgramRecord),
      details: errorDetails(name, error, "failed"),
      error,
      replaced: false,
      evicted: [],
    };
  }

  const { parse, result } = parseProgram(text);
  const write = programStore.setSource(
    name,
    text,
    parse,
    result,
    toolCallId,
    opts,
  );

  if (write.overflow !== "") {
    return {
      record: write.record,
      details: errorDetails(name, write.overflow, "failed"),
      error: write.overflow,
      replaced: write.replaced,
      evicted: write.evicted,
    };
  }

  return {
    record: write.record,
    details: detailsOf(write.record, {
      streaming: opts.streaming === true,
      chunkChars: text.length,
    }),
    error: "",
    replaced: write.replaced,
    evicted: write.evicted,
  };
}

/**
 * Append one streamed chunk. The first chunk of a name nothing holds opens the
 * program — that is the natural streaming order — and its row is the one the
 * program is painted from until a render replaces it.
 */
export function appendChunk(
  name: string,
  chunk: string,
  done: boolean,
  toolCallId: string,
): ProgramWriteOutcome {
  const existing = programStore.get(name);
  if (existing === undefined)
    return writeProgram(name, chunk ?? "", toolCallId, { streaming: !done });

  const held = existing.source + (chunk ?? "");
  if (held.length > MAX_PROGRAM_CHARS) {
    const error = sourceTooBig(held.length, MAX_PROGRAM_CHARS);
    return {
      record: existing,
      details: detailsOf(existing, {
        streaming: true,
        chunkChars: (chunk ?? "").length,
      }),
      error,
      replaced: false,
      evicted: [],
    };
  }

  const { parse, result } = parseProgram(held);
  const write = programStore.append(name, chunk ?? "", parse, result, { done });
  if ("error" in write)
    return {
      record: {} as ProgramRecord,
      details: errorDetails(name, write.error, "unknown"),
      error: write.error,
      replaced: false,
      evicted: [],
    };

  return {
    record: write.record,
    details: detailsOf(write.record, {
      streaming: write.record.streaming,
      chunkChars: (chunk ?? "").length,
    }),
    error: "",
    replaced: false,
    evicted: [],
  };
}

/** What the log holds for one program, in the shape a tool answers with. */
export function detailsOf(
  record: ProgramRecord,
  extra: { streaming: boolean; chunkChars: number },
): OpenUIProgramDetails {
  const info = programStore.infoOf(record);
  const hard = record.parse.diagnostics.filter(
    (row) => row.severity === "error",
  );

  return {
    status: record.name === "" ? "failed" : "ok",
    error: "",
    ok: hard.length === 0 && !record.parse.incomplete,
    name: record.name,
    chars: info.chars,
    chunkChars: extra.chunkChars,
    statements: info.statements,
    components: record.publication.drawn.length || info.components,
    unresolved: record.parse.unresolved,
    diagnostics: record.parse.diagnostics,
    incomplete: record.parse.incomplete,
    streaming: extra.streaming,
    live: record.live,
    drawn: true,
    waiting: record.events.length,
    queries:
      record.publication.queries.length > 0
        ? record.publication.queries
        : record.parse.queries,
  };
}

/** Take programs out of the log, and let their data caches and their answers go with them. */
export function dropPrograms(names: readonly string[]): void {
  for (const name of names) {
    dropRuntime(name);
    // A screen that leaves the log leaves the paragraph it put in the draft too:
    // an answer staged by a question nobody can see any more is text the person
    // has to notice and delete by hand.
    answerSheet.dropBlock(name);
  }
}
