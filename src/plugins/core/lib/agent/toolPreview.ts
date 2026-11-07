/**
 * The one line a tool's header shows.
 *
 * A tool row has a header the log draws from `ToolExecution`, and every plugin
 * has to answer the same question for it: what is this call doing, in words a
 * reader can scan without opening the rows below. The words differ per tool —
 * what it is reading, what its empty answer means, what a failure of its own
 * looks like — but the order they are tried in does not, so it lives here.
 */

import type { ToolTranscriptItem } from "./transcriptState";
import { clipText, firstLineOf } from "./toolText";

/** How wide a tool header's preview is before it is clipped. */
export const TOOL_PREVIEW_MAX = 96;

/** What a plugin's tools say, in the tool's own words. */
export interface ToolPreviewVocabulary {
  /** what each tool is doing while it runs, by tool name */
  running: Readonly<Record<string, string>>;
  /** what a running tool of an unknown name is doing */
  runningDefault: string;
  /** the statuses that mean the scope came back empty, whatever tool answered */
  clean: readonly string[];
  /** what an empty answer means, by tool name */
  empty: Readonly<Record<string, string>>;
  /** what an empty answer means for a tool that has no words of its own */
  emptyDefault: string;
  /** a status that answers the same whatever tool it belongs to */
  stated: Readonly<Record<string, string>>;
}

/** Details of an unknown shape answer in their own first line of text. */
export function toolPreviewFallback(
  item: ToolTranscriptItem,
  max: number = TOOL_PREVIEW_MAX,
): string {
  const line = firstLineOf(item.output);
  if (item.status === "error")
    return `${item.name.toLowerCase()} · ${line === "" ? "failed" : line}`;
  return line === "" ? item.name.toLowerCase() : clipText(line, max);
}

/**
 * The header line: what is running, why it failed, and when the call answered
 * with what — the counts, ids and bodies belong to the rows, so the header
 * never repeats them.
 */
export function toolPreviewLine<T extends { status: string }>(
  item: ToolTranscriptItem,
  view: T | null,
  words: ToolPreviewVocabulary,
  scopeOf: (tool: string, view: T) => string,
  max: number = TOOL_PREVIEW_MAX,
): string {
  const tool = item.name.toLowerCase();
  if (item.status === "running")
    return words.running[tool] ?? words.runningDefault;

  if (view === null) return toolPreviewFallback(item, max);
  if (view.status === "failed") return `${tool} · failed`;

  const stated = words.stated[view.status];
  if (stated !== undefined) return stated;

  if (words.clean.includes(view.status))
    return words.empty[tool] ?? words.emptyDefault;

  return clipText(scopeOf(tool, view), max);
}
