import { commandTextOf } from "../agent/toolInput";
import type { ToolTranscriptItem } from "../agent/transcriptState";

export type OutputMode = "code" | "markdown";

export const MAX_OUTPUT_LINES = 40;

/**
 * A command's answer is text a program printed, never prose the model wrote: it
 * is drawn as code, with no guess at whether it looks like markdown. The call's
 * **shape** decides, not its name — mu's tool set is fixed by `APP_TOOL_NAMES`
 * in `core/lib/agent/agentService.ts` with extensions and MCP off, so a list of
 * command-tool names can only drift into names no call ever has.
 */
export function outputModeFor(item: ToolTranscriptItem): OutputMode {
  return commandTextOf(item.args) === "" ? "markdown" : "code";
}

/** Which end a bounded body keeps: a shell's tail holds the result a command ended on, a script's head holds the answer it printed first. */
export type OutputKeep = "head" | "tail";

export function plainOutputOf(
  output: string,
  max: number = MAX_OUTPUT_LINES,
  keep: OutputKeep = "tail",
): string {
  const lines = output.split("\n");
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  if (lines.length <= max) return lines.join("\n");

  const elided = lines.length - max;
  const word = elided === 1 ? "line" : "lines";
  if (keep === "head")
    return [
      ...lines.slice(0, max),
      `… ${elided} later ${word} (${lines.length} total)`,
    ].join("\n");

  return [
    `… ${elided} earlier ${word} (${lines.length} total)`,
    ...lines.slice(-max),
  ].join("\n");
}
