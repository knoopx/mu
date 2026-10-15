import { joinTextParts, toolImageOf, type ToolImage } from "./content";

export function extractToolOutput(result: unknown): string {
  if (result === undefined || result === null) return "";
  if (typeof result === "string") return result;
  const r = result as {
    content?: Array<{
      type: string;
      text?: string;
      data?: string;
      mimeType?: string;
    }>;
    details?: unknown;
  };
  if (Array.isArray(r.content)) {
    const text = joinTextParts(r.content, "\n");
    if (text) return text;
  }
  if (r.details && typeof r.details === "object") {
    const d = r.details as Record<string, unknown>;
    if (typeof d.output === "string") return d.output;
  }
  try {
    return JSON.stringify(result);
  } catch {
    return String(result);
  }
}

export function extractToolImage(result: unknown): ToolImage | undefined {
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

export function extractToolDetails(result: unknown): unknown {
  if (result === undefined || result === null || typeof result !== "object")
    return undefined;
  const details = (result as { details?: unknown }).details;
  return details === undefined ? undefined : details;
}

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
