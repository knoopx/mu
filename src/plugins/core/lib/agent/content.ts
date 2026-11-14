function textParts(content: unknown): Array<{ type: string; text?: string }> {
  if (!Array.isArray(content)) return [];
  return content.filter(
    (part): part is { type: string; text?: string } =>
      typeof part === "object" &&
      part !== null &&
      (part as { type?: unknown }).type === "text",
  );
}

export function joinTextParts(content: unknown, sep: string): string {
  return textParts(content)
    .map((part) => part.text ?? "")
    .join(sep);
}

export function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  return joinTextParts(content, "");
}

export interface ToolImage {
  src: string;

  mimeType: string;

  bytes: number;
}

function imageBlocksOf(
  content: unknown,
): Array<{ data: string; mimeType: string }> {
  if (!Array.isArray(content)) return [];
  const out: Array<{ data: string; mimeType: string }> = [];
  for (const part of content) {
    if (
      typeof part === "object" &&
      part !== null &&
      (part as { type?: unknown }).type === "image" &&
      typeof (part as { data?: unknown }).data === "string" &&
      (part as { data?: string }).data !== ""
    ) {
      const data = (part as { data: string }).data;
      const mimeType = (part as { mimeType?: unknown }).mimeType;
      out.push({
        data,
        mimeType: typeof mimeType === "string" ? mimeType : "image/*",
      });
    }
  }
  return out;
}

function byteSizeOf(base64: string): number {
  const stripped = base64.replace(/^data:[^,]*,/, "");
  const padding = stripped.endsWith("==") ? 2 : stripped.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.round((stripped.length * 3) / 4) - padding);
}

export function toolImagesOf(content: unknown): ToolImage[] {
  return imageBlocksOf(content).map((block) => ({
    src: `data:${block.mimeType};base64,${block.data}`,
    mimeType: block.mimeType,
    bytes: byteSizeOf(block.data),
  }));
}

export function toolImageOf(content: unknown): ToolImage | undefined {
  return toolImagesOf(content)[0];
}
