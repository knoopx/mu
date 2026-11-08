import type {
  TranscriptItem,
  AssistantUsage,
} from "../../src/plugins/core/lib/agent/transcriptState";
import type { ToolImage } from "../../src/plugins/core/lib/agent/content";
import { toolCallFixture, type ToolFixture } from "./tool";

export const T0 = 1_794_039_240_000;

export const at = (ms: number): number => T0 + ms;

export const min = (m: number): number => m * 60_000;

export const userTurn = (
  id: string,
  text: string,
  minutes: number,
  images?: ToolImage[],
): TranscriptItem => ({
  kind: "user",
  id,
  text,
  ts: at(min(minutes)),
  ...(images === undefined ? {} : { images }),
});

export const usage = (
  input: number,
  output: number,
  cost: number,
  startMin: number,
  endMin: number,
): AssistantUsage => ({
  input,
  output,
  cost,
  genMs: (endMin - startMin) * 1000 * 60,
  startTs: at(startMin * 60_000),
  endTs: at(endMin * 60_000),
});

export const answer = (
  id: string,
  text: string,
  opts: {
    streaming?: boolean;
    stopReason?: string;
    reasoning?: string;
    startTs?: number;
  } = {},
): Extract<TranscriptItem, { kind: "assistant" }> => ({
  kind: "assistant",
  id,
  text,
  streaming: opts.streaming === true,
  ...(opts.streaming === true ? {} : { stopReason: opts.stopReason ?? "stop" }),
  ...(opts.startTs === undefined ? {} : { startTs: opts.startTs }),
  ...(opts.reasoning === undefined ? {} : { reasoning: opts.reasoning }),
});

/** When a row began, for the scene's own clock. */
const stampsOf = (item: TranscriptItem): (number | undefined)[] => {
  if (item.kind === "user") return [item.ts];
  if (item.kind === "assistant")
    return [item.startTs, item.usage?.startTs, item.usage?.endTs];
  if (item.kind === "tool") return [item.startTs, item.usage?.endTs];
  return [];
};

/**
 * The moment a scene's figures are read at: a moment and a half past its last
 * row. The status bar's elapsed time and live speed are read off a running
 * clock, so a scene without a pinned one would print a different PNG on every
 * capture.
 */
export const clockOf = (items: readonly TranscriptItem[]): number => {
  let last = T0;
  for (const item of items)
    for (const ts of stampsOf(item))
      if (ts !== undefined && ts > last) last = ts;
  return last + 1_500;
};

export const ran = (
  id: string,
  name: string,
  args: Record<string, unknown>,
  output: string,
  ms: number,
  extra?: Partial<ToolFixture>,
): TranscriptItem =>
  toolCallFixture(id, name, args, "ok", output, { startTs: at(ms), ...extra });

export const failed = (
  id: string,
  name: string,
  args: Record<string, unknown>,
  output: string,
  ms: number,
): TranscriptItem =>
  toolCallFixture(id, name, args, "error", output, { startTs: at(ms) });

export const running = (
  id: string,
  name: string,
  args: Record<string, unknown>,
): TranscriptItem => toolCallFixture(id, name, args, "running", "");
