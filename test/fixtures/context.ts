import type { TranscriptItem } from "../../src/plugins/core/lib/agent/transcriptState";

export const CHARS_PER_TOKEN = 4;

export const SYSTEM_PROMPT_TOKENS = 4_600;

export const IMAGE_TOKENS = 1_600;

export const tokensOf = (text: string): number =>
  Math.ceil(text.length / CHARS_PER_TOKEN);

function argsTokens(args: Record<string, unknown>): number {
  try {
    return tokensOf(JSON.stringify(args));
  } catch {
    return 0;
  }
}

export function contextUsedOf(items: readonly TranscriptItem[]): number {
  let used = SYSTEM_PROMPT_TOKENS;
  for (const item of items) {
    if (item.kind === "user") {
      used += tokensOf(item.text) + (item.images?.length ?? 0) * IMAGE_TOKENS;
      continue;
    }
    if (item.kind === "assistant") {
      const usage = item.usage;
      if (usage !== undefined)
        used = Math.max(used, usage.input + usage.output);
      used += tokensOf(item.text) + tokensOf(item.reasoning ?? "");
      continue;
    }
    if (item.kind === "tool") {
      used +=
        argsTokens(item.args) +
        tokensOf(item.output) +
        (item.image === undefined ? 0 : IMAGE_TOKENS);
      continue;
    }
    used += tokensOf(item.text);
  }
  return Math.round(used / 100) * 100;
}
