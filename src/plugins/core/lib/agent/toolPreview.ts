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
import { clipText } from "./toolText";
import { firstLine } from "../../../../utils/truncate";

/** How wide a tool header's preview is before it is clipped. */
const TOOL_PREVIEW_MAX = 96;

/**
 * How wide a header's own line is — narrower than a preview of an answer, since
 * a header sits beside the tool's name and the call's state mark.
 */
const HEADER_PREVIEW_MAX = 72;

/** One line of a header: collapsed to a row of text, then cut to the budget. */
export function headerSnippet(
  value: string,
  max: number = HEADER_PREVIEW_MAX,
): string {
  return clipText(value.split(/\s+/).filter(Boolean).join(" "), max);
}

/**
 * One header line, with the counts that must outlive the clip.
 *
 * A header is one line, and the scope part is the part a reader can recover — the
 * path, number or words are in the answer below — while how much of the answer is on
 * screen is the part they cannot. So when the line runs past the budget the scope
 * gives way and the tail never does. Every plugin builds its header through here, so
 * the figures that used to sit under an answer sit beside its name instead.
 */
export function headerLineOf(
  scope: string,
  tail: readonly string[],
  max: number = TOOL_PREVIEW_MAX,
): string {
  const counts = tail.filter((word) => word !== "").join(" · ");
  if (counts === "") return clipText(scope, max);
  if (scope === "") return clipText(counts, max);
  // 3 for the separator, 1 for the ellipsis `clipText` adds when the scope gives way.
  const room = Math.max(8, max - counts.length - 4);
  return `${clipText(scope, room)} · ${counts}`;
}

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

/** A header that has nothing better to say still has to say the call ended. */
const FAILED_TEXT = "failed";

/** Details of an unknown shape answer in their own first line of text. */
function toolPreviewFallback(
  item: ToolTranscriptItem,
  max: number = TOOL_PREVIEW_MAX,
): string {
  const line = firstLine(item.output);
  // The header's title already IS the tool's name, so a preview that begins with
  // it prints the word twice — `codemode codemode`, `plan plan · failed`.
  if (item.status === "error")
    return line === "" ? FAILED_TEXT : clipText(line, max);
  return line === "" ? "" : clipText(line, max);
}

/**
 * The header line: what is running, why it failed, and when the call answered
 * with what — the counts, ids and bodies belong to the rows, so the header
 * never repeats them, and it never repeats its own title either. A count the
 * rows print nowhere is the header's to say, and `scopeOf` is where a plugin
 * trails one along the line's width.
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

  // A call that failed still names what it was pointed at: `scopeOf` is where the
  // plugin says, and a refusal belongs on this line rather than in the card below,
  // which holds content. Only a plugin with nothing to say falls back to the word.
  if (view.status === "failed") {
    const said = scopeOf(tool, view);
    return said === "" ? FAILED_TEXT : clipText(said, max);
  }

  const stated = words.stated[view.status];
  if (stated !== undefined) return stated;

  if (words.clean.includes(view.status))
    return words.empty[tool] ?? words.emptyDefault;

  return clipText(scopeOf(tool, view), max);
}
