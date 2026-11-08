/**
 * How an OpenUI fact is written down.
 *
 * An event's time, a bound value, one long string clipped for a row: the same
 * three shapes are needed by the answer the model reads and the rows the log
 * paints, and they have to agree, so they are said once here.
 */

import { TOOL_PREVIEW_MAX } from "../../core/lib/agent/toolPreview";
import { clipText } from "../../core/lib/agent/toolText";
import { singleLine } from "../../../utils/truncate";

/** When the human did it, to the second, in the reader's own clock. */
export const clock = (at: number): string =>
  new Date(at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

/** A bound value as one line: strings stay strings, everything else is JSON. */
export const valueText = (value: unknown): string =>
  typeof value === "string" ? value : (JSON.stringify(value) ?? String(value));

/**
 * One line, clipped to what a row can hold. The budget is the log's own — the
 * one line a tool header shows — and the ellipsis is `clipText`'s, so a plugin
 * cannot drift from the header its own rows sit under.
 */
export const clip = (
  text: string,
  max: number = TOOL_PREVIEW_MAX,
): string => clipText(singleLine(text), max);

/** A bound value, clipped for a row. */
export const clipValue = (value: unknown): string => clip(valueText(value));
