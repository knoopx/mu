/** The info string that makes a block a screen. */
const UI_LANGUAGE = "ui";

/** One of a reply's `ui` blocks, and what became of its delimiter. */
export interface ReplyFence {
  /** Its index among the message's `ui` blocks, in document order.
   *  This, with the message's place in the conversation, is the block's state key. */
  fence: number;
  /** The block's source, delimiters and indentation stripped. */
  source: string;
  /** `closed` arrived; `unclosed` means the reply ended mid-block; `streaming` means it is still coming. */
  status: "streaming" | "closed" | "unclosed";
}

/** One part of a reply: prose the markdown block draws, or a screen mu paints. */
export type ReplySegment =
  | { kind: "prose"; text: string }
  | { kind: "ui"; fence: ReplyFence };

/** A reply, cut in document order into the prose the markdown block draws and the screens mu paints. */
export interface ReplyBlocks {
  /** The parts of the reply, in the order they stand in it. */
  segments: ReplySegment[];
  /** The `ui` blocks, in document order. */
  fences: ReplyFence[];
  /** Whether the text holds a `ui` block at all. */
  hasFence: boolean;
}

/** The opening delimiter of a fence: up to three spaces, three or more backticks, then the info string. */
const openerOf = (
  line: string,
): { marker: string; language: string } | null => {
  const match = /^ {0,3}(`{3 })[ \t]*(.*)$/.exec(line);
  if (match === null) return null;
  return {
    marker: match[1] ?? "",
    language: (match[2] ?? "").trim().split(/\s+/)[0] ?? "",
  };
};

/** Whether `line` closes a fence opened with `marker` (a run of backticks at least as long, with no info string). */
const closesOf = (line: string, marker: string): boolean => {
  const match = /^ {0,3}(`{3 })[ \t]*$/.exec(line);
  return match !== null && (match[1] ?? "").length >= marker.length;
};

/** The language that makes a block a screen, or "" for a block that stays prose. */
const languageOf = (info: string): string => info.trim().toLowerCase();

/**
 * Cut a reply into prose and `ui` blocks.
 *
 * `streaming` says the reply is still arriving, which is the only thing that
 * makes an unterminated block `streaming` rather than `unclosed`: a reply that
 * finished without its closing delimiter is a block that is as final as a closed
 * one, and its diagnostics are settled.
 *
 * A block's own indentation is taken off every line of it, so a block written
 * inside a list still parses.
 */
export function replyBlocks(text: string, streaming: boolean): ReplyBlocks {
  const lines = text.split("\n");
  const segments: ReplySegment[] = [];
  const fences: ReplyFence[] = [];
  let buffer: string[] = [];
  let marker = "";
  let indent = 0;
  let openedAt = -1;

  const flushProse = (): void => {
    const chunk = buffer.join("\n");
    if (chunk.trim() !== "") segments.push({ kind: "prose", text: chunk });
    buffer = [];
  };

  for (const line of lines) {
    if (marker === "") {
      const opener = openerOf(line);
      if (opener !== null && languageOf(opener.language) === UI_LANGUAGE) {
        flushProse();
        marker = opener.marker;
        openedAt = line.length - line.trimStart().length;
        indent = openedAt;
        continue;
      }
      buffer.push(line);
      continue;
    }
    if (closesOf(line, marker)) {
      const closed: ReplyFence = {
        fence: fences.length,
        source: dedent(buffer, indent),
        status: "closed",
      };
      fences.push(closed);
      // A closed block is a screen the reply paints, not text the reply says:
      // the segment is what paints it, and the buffer is cleared so the block's
      // own lines cannot leak into the prose that follows it. Only the open
      // branch below used to push a segment, so a block whose delimiter arrived
      // never drew at all while its source printed below the answer.
      segments.push({ kind: "ui", fence: closed });
      buffer = [];
      marker = "";
      indent = 0;
      continue;
    }
    buffer.push(line);
  }

  if (marker === "") {
    flushProse();
    return { segments, fences, hasFence: fences.length > 0 };
  }

  // The delimiter never arrived: still coming, or the reply ended without it.
  const open: ReplyFence = {
    fence: fences.length,
    source: dedent(buffer, indent),
    status: streaming ? "streaming" : "unclosed",
  };
  fences.push(open);
  segments.push({ kind: "ui", fence: open });
  return { segments, fences, hasFence: fences.length > 0 };
}

/** Take the block's own indentation off every line of it. */
function dedent(lines: readonly string[], indent: number): string {
  return lines
    .map((line) =>
      line.startsWith(" ".repeat(indent)) ? line.slice(indent) : line,
    )
    .join("\n")
    .trim();
}
