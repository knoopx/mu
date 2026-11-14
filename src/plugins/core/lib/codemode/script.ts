/**
 * The call side of a codemode row: the script the model ran.
 *
 * codemode is pi's own tool rather than a plugin's, and it has no answer shaped
 * like a table — what it returns is the source it ran, the calls that source made,
 * and the text it printed — so the log paints those three blocks in pi's order and
 * leaves its header bare, exactly as pi's terminal prints a bold `codemode` over
 * the script rather than a sentence about it.
 */

import type { ToolTranscriptItem } from "../agent/transcriptState";

export const CODEMODE_TOOL = "codemode";

/**
 * How many lines of a script the row paints before it says how many there were.
 *
 * The script is the one part of a codemode call the row cannot invent: the calls
 * and the printed text are the answer, but what a script *does* lives in its
 * source. pi paints ten lines collapsed and the whole thing on one keypress; the
 * log has no keypress, so it stands a little taller than pi's collapsed view and
 * names what fell off.
 */
export const MAX_SCRIPT_LINES = 12;

/** The script as the model wrote it, `code` being pi's own parameter name. */
export function codemodeScriptOf(item: ToolTranscriptItem): string {
  const code = item.args?.code;
  return typeof code === "string" ? code : "";
}

/**
 * The header says the tool's name and nothing else.
 *
 * Every other tool's header names the thing it was pointed at — a path, a rev, a
 * query — because its answer is a shape the log paints and the scope has to be said
 * somewhere. A script has no scope: its own source is the first block of its
 * answer, and a line quoting its first statement over the top of that source is a
 * caption repeating the thing beneath it. pi prints a bare `codemode` there, and so
 * does this.
 */
export const codemodePreviewOf = (): string => "";
