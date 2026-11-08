/**
 * The call side of a codemode row: the script the model ran.
 *
 * codemode is pi's own tool rather than a plugin's, and it has no answer
 * shaped like a table — what it returns is text a script printed plus the list
 * of calls that script made — so the log reads it the way pi's terminal does.
 */

import type { ToolTranscriptItem } from "../agent/transcriptState";
import { clipText } from "../agent/toolText";
import { TOOL_PREVIEW_MAX } from "../agent/toolPreview";

export const CODEMODE_TOOL = "codemode";

/** A leading `// @options: {…}` is a directive, not the call: the header shows what the script does. */
const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*)/;

function codemodeScriptOf(item: ToolTranscriptItem): string {
  const code = item.args?.code;
  return typeof code === "string" ? code : "";
}

/** The first real line of the script, for the tool header. */
export function codemodePreviewOf(item: ToolTranscriptItem): string {
  const lines = codemodeScriptOf(item).split("\n");
  const first =
    lines.find(
      (line) => line.trim() !== "" && !COMMENT_LINE.test(line),
    ) ?? "";
  const text = first.trim();
  return text === "" ? CODEMODE_TOOL : clipText(text, TOOL_PREVIEW_MAX);
}
