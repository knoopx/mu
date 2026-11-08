export type OutputMode = "code" | "markdown";

export const PLAIN_OUTPUT_TOOLS: ReadonlySet<string> = new Set([
  "bash",
  "shell",
  "terminal",
  "exec",
  "run",
  "powershell",
  "ls",
  "grep",
  "find",
]);

export const MAX_OUTPUT_LINES = 40;

export function isPlainOutputTool(name: string): boolean {
  return PLAIN_OUTPUT_TOOLS.has(name.toLowerCase());
}

/**
 * A command tool's output is text the shell printed, never prose the model
 * wrote: it is drawn as code, with no guess at whether it looks like markdown.
 */
export function outputModeFor(name: string): OutputMode {
  if (isPlainOutputTool(name)) return "code";
  return "markdown";
}

export function plainOutputOf(
  output: string,
  max: number = MAX_OUTPUT_LINES,
): string {
  const lines = output.split("\n");
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  if (lines.length <= max) return lines.join("\n");

  const elided = lines.length - max;
  return [
    `… ${elided} earlier ${elided === 1 ? "line" : "lines"} (${lines.length} total)`,
    ...lines.slice(-max),
  ].join("\n");
}
