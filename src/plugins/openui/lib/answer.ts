/**
 * The part of an OpenUI answer that is not a list of rows.
 *
 * Every tool names the program it acted on, says whether it found it, and then
 * prints what the store holds. The way a missing program, an empty source and
 * an oversized one are named lives here, so eleven tools say it the same way —
 * and so does the whole shape of a write's answer, which a render and a stream
 * otherwise spelled twice.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";

import { blocks, toolResult } from "../../core/lib/agent/toolText";
import type { OpenUIProgramDetails } from "../types";
import { ROOT_COMPONENT, ROOT_STATEMENT } from "../constants";
import { diagnosticLines, programStatusRow, programWriteHead } from "./format";
import { programStore } from "./programStore/store";
import type { ProgramWriteOutcome } from "./programStore/verbs";

/** The sentence a call answers with when the name it gave is not in the log. */
export const unknownProgram = (name: string): string =>
  name === ""
    ? "no program is showing — render one, or name one of the programs in the log"
    : `no program named "${name}" is in the log`;

/** A program name, as an answer spells it. */
export const programWord = (name: string): string =>
  name === "" ? "the showing program" : `program "${name}"`;

/** What a call says when a source is empty or too big to hold. */
export const sourceTooBig = (chars: number, max: number): string =>
  `${String(chars)} characters is over this app's limit of ${String(max)} — a screen, not a website`;

export const emptySource = (): string =>
  "the source is empty: write at least one statement, starting with the root";

/** The reminder a call answers with when a program has no root statement. */
export const noRootHint = (): string =>
  `a program must define \`${ROOT_STATEMENT} = ${ROOT_COMPONENT}([ ... ])\``;

/** What a write's own tool supplies around the answer it all shares. */
export interface ProgramWriteWords {
  /** The sentence that stands in for a body when the store refused the write. */
  refusal: string;
  /** The columns only this kind of write counts — a render's `ok`, a stream's `chunk`. */
  columns?: Readonly<Record<string, string | number>>;
  /**
   * True where a half-written program is the expected state — a stream
   * mid-flight — so its warnings are noise and only hard errors are printed.
   */
  errorsOnly?: boolean;
  /** The move to make next; printed only when the parse has a hard error. */
  hint?: string;
}

/**
 * The answer both program writes give: the columns, the store's line for what
 * is now in the log, every diagnostic worth naming, and the refusal — with the
 * error in place of a body — when the store took nothing.
 */
export function programWriteAnswer(
  outcome: ProgramWriteOutcome,
  words: ProgramWriteWords,
): AgentToolResult<OpenUIProgramDetails> {
  if (outcome.error !== "")
    return toolResult(blocks(words.refusal, outcome.error), outcome.details);

  const diagnostics =
    words.errorsOnly === true
      ? outcome.details.diagnostics.filter((row) => row.severity === "error")
      : outcome.details.diagnostics;

  return toolResult(
    blocks(
      programWriteHead(outcome.details, words.columns),
      programStatusRow(programStore.infoOf(outcome.record)),
      diagnosticLines(diagnostics),
      outcome.details.ok ? "" : (words.hint ?? ""),
    ),
    outcome.details,
  );
}
