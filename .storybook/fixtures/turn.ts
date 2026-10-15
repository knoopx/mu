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
  opts: { streaming?: boolean; stopReason?: string; reasoning?: string } = {},
): Extract<TranscriptItem, { kind: "assistant" }> => ({
  kind: "assistant",
  id,
  text,
  streaming: opts.streaming === true,
  ...(opts.streaming === true ? {} : { stopReason: opts.stopReason ?? "stop" }),
  ...(opts.reasoning === undefined ? {} : { reasoning: opts.reasoning }),
});

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
