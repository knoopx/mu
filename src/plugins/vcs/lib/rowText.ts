/**
 * How a row of a vcs panel is worded.
 *
 * The change stack and the operation log list the same kind of row — jj's words
 * for the thing, and how long ago it happened — so the wording lives here rather
 * than in whichever panel drew it first.
 */
import { firstLine } from "../../../utils/truncate";
import { relativeAge } from "../../core/lib/utils/time";
import { NO_DESCRIPTION, OPLOG_TIME_CHARS } from "../constants";

/** The first line of what jj wrote, or the placeholder when it wrote nothing. */
export function rowLabel(description: string): string {
  return firstLine(description) || NO_DESCRIPTION;
}

/**
 * How long ago an operation ran.
 *
 * jj prints an operation's time as a range — opened and closed, the two stamps
 * of a transaction — and only the moment it opened is worth a row's column. It
 * is also the shape the change stack's rows print, which is what `relativeAge`
 * reads.
 */
export function operationAge(time: string): string {
  return relativeAge(time.slice(0, OPLOG_TIME_CHARS));
}
