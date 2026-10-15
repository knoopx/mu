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

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^#{1,6}[ \t]+\S/;
const HR = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;
const BULLET = /^[ \t]*[-*+][ \t]+\S/;
const NUMBERED = /^[ \t]*\d+[.)][ \t]+\S/;
const BLOCKQUOTE = /^[ \t]*>[ \t]+\S/;
const BOLD = /\*\*[^*\n]+\*\*/;
const LINK = /\[[^\]\n]*\]\([^)\n]+\)/;
const TABLE_SEPARATOR =
  /^[ \t]*\|?[ \t]*:?-{1,}:?[ \t]*(\|[ \t]*:?-{1,}:?[ \t]*)+\|?[ \t]*$/;

export function markdownSignals(source: string): string[] {
  const lines = source.split("\n");
  const signals: string[] = [];

  if (lines.some((line) => FENCE.test(line))) signals.push("fence");

  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].includes("|") && TABLE_SEPARATOR.test(lines[i + 1])) {
      signals.push("table");
      break;
    }
  }

  const headings = lines.filter((line) => HEADING.test(line)).length;
  const firstLine = lines.find((line) => line.trim() !== "") ?? "";
  if (headings >= 2 || (headings >= 1 && HEADING.test(firstLine)))
    signals.push("heading");

  if (lines.some((line) => HR.test(line))) signals.push("rule");
  if (lines.some((line) => BOLD.test(line))) signals.push("bold");
  if (lines.some((line) => LINK.test(line))) signals.push("link");

  const nonEmpty = lines.filter((line) => line.trim() !== "");
  const listLines = nonEmpty.filter(
    (line) => BULLET.test(line) || NUMBERED.test(line),
  ).length;
  if (listLines >= 2 && listLines / nonEmpty.length >= 0.6)
    signals.push("list");

  const quotes = nonEmpty.filter((line) => BLOCKQUOTE.test(line)).length;
  if (quotes >= 2 && quotes / nonEmpty.length >= 0.5) signals.push("quote");

  return signals;
}

export function looksLikeMarkdown(source: string): boolean {
  return markdownSignals(source).length > 0;
}

export function outputModeFor(name: string, output: string): OutputMode {
  if (isPlainOutputTool(name) && !looksLikeMarkdown(output)) return "code";
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
