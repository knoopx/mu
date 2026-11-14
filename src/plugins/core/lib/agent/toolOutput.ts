import { joinTextParts, toolImageOf, type ToolImage } from "./content";

/** The `output` a tool's details carry, when its content has nothing to say. */
function detailsOutputOf(details: unknown): string | undefined {
  if (!details || typeof details !== "object") return undefined;
  const output = (details as { output?: unknown }).output;
  return typeof output === "string" ? output : undefined;
}

/**
 * The text a tool answer carries.
 *
 * A `content` array is the answer itself, so an empty one is a real state and
 * not an unknown shape: the shell tools open a call with `content: []` to say
 * the command started, and falling through to `JSON.stringify` painted
 * `{"content":[]}` as the first line of every bash row. Only a value that is
 * not a tool result at all — no content, no details — is shown as JSON.
 */
function extractToolOutput(result: unknown): string {
  if (result === undefined || result === null) return "";
  if (typeof result === "string") return result;
  if (typeof result !== "object") return String(result);
  const r = result as {
    content?: unknown;
    details?: unknown;
  };
  if (Array.isArray(r.content)) {
    return joinTextParts(r.content, "\n") || (detailsOutputOf(r.details) ?? "");
  }
  const fromDetails = detailsOutputOf(r.details);
  if (fromDetails !== undefined) return fromDetails;
  try {
    return JSON.stringify(result);
  } catch {
    return String(result);
  }
}

function extractToolImage(result: unknown): ToolImage | undefined {
  if (result === undefined || result === null || typeof result !== "object")
    return undefined;
  const r = result as { content?: unknown; structuredContent?: unknown };
  const fromContent = toolImageOf(r.content);
  if (fromContent) return fromContent;
  const structured = r.structuredContent;
  if (
    typeof structured === "object" &&
    structured !== null &&
    (structured as { type?: unknown }).type === "image"
  ) {
    return toolImageOf([structured]);
  }
  return undefined;
}

function extractToolDetails(result: unknown): unknown {
  if (result === undefined || result === null || typeof result !== "object")
    return undefined;
  const details = (result as { details?: unknown }).details;
  return details === undefined ? undefined : details;
}

/**
 * The one read of a tool result: what it said, what it answered with, and the
 * image in it when there is one. The three readers below are private on purpose
 * — a caller takes all three at once, and a caller that picks one is a caller
 * that has decided what a tool result means for itself.
 */
export function resultParts(result: unknown): {
  output: string;
  details: unknown;
  image: ToolImage | undefined;
} {
  return {
    output: extractToolOutput(result),
    details: extractToolDetails(result),
    image: extractToolImage(result),
  };
}
