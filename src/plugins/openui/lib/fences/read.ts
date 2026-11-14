/**
 * Reading a reply's `ui` blocks.
 *
 * The reference implementation of this plugin (bb-plugin-genui) has the agent
 * write the screen **inline in its reply**, as a fenced block: a UI costs no
 * extra model call, it is part of the answer, and it draws while the reply
 * streams. mu has no code-fence slot in the native markdown element, so mu does
 * what that plugin's fallback path does — find the blocks in the reply text,
 * hide them from the prose, and paint the same program in their place.
 *
 * The rules that follow are that plugin's: a block is `streaming` while the
 * reply is still arriving, `closed` when its closing delimiter arrived, and
 * `unclosed` when the reply ended without one. A block keeps its place among the
 * message's blocks, which is what its state key is made of, and a block of any
 * other language is left alone — it is a code block, not a screen.
 */

/** How far a fenced block may be indented and still be a fence (markdown's rule). */
const MAX_FENCE_INDENT = 3;

/** The info string that makes a block a screen. */
export const UI_LANGUAGE = "ui";

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
  { kind: "prose"; text: string } | { kind: "ui"; fence: ReplyFence };

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
  const match = /^ {0,3}(`{3,})[ \t]*(.*)$/.exec(line);
  if (match === null) return null;
  return {
    marker: match[1] ?? "",
    language: (match[2] ?? "").trim().split(/\s+/)[0] ?? "",
  };
};

/** Whether `line` closes a fence opened with `marker` (a run of backticks at least as long, with no info string). */
const closesOf = (line: string, marker: string): boolean => {
  const match = /^ {0,3}(`{3,})[ \t]*$/.exec(line);
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
      fences.push({
        fence: fences.length,
        source: dedent(buffer, indent),
        status: "closed",
      });
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

/** A block that is still arriving must not be treated as final. */
export const isStreamingFence = (fence: ReplyFence): boolean =>
  fence.status === "streaming";
