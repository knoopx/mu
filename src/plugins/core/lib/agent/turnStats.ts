import type { AssistantUsage, TranscriptItem } from "./transcriptState";

export const UP = "↑";
export const DOWN = "↓";
export const DOT = "·";
export const BAR = "|";

export interface StatsFigures {
  input: number;

  output: number;

  cost: number;

  durMs: number;

  tpsOutput: number;

  genMs: number;
}

export interface TurnStats extends StatsFigures {
  settled: boolean;
}

export interface ConversationStats extends StatsFigures {
  turns: number;
}

function f1(x: number): string {
  const i = Math.round(x * 10);
  return `${Math.trunc(i / 10)}.${Math.abs(i % 10)}`;
}

function f2(x: number): string {
  const i = Math.round(x * 100);
  return `${Math.trunc(i / 100)}.${String(Math.abs(i % 100)).padStart(2, "0")}`;
}

export function formatTokens(tokens: number | null | undefined): string {
  if (tokens == null) return "";
  if (tokens >= 1_000_000) return `${f1(tokens / 1_000_000)}M`;
  if (tokens >= 1_000) return `${f1(tokens / 1_000)}K`;
  return String(tokens);
}

export function formatDuration(ms: number): string {
  const clamped = Math.max(0, ms);
  const h = Math.floor(clamped / 3_600_000);
  const m = Math.floor((clamped % 3_600_000) / 60_000);
  const s = Math.floor(((clamped % 3_600_000) % 60_000) / 1000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  if (s < 1) return `${f2(clamped / 1000)}s`;
  return `${s}s`;
}

export function formatTokensPerSecond(output: number, genMs: number): string {
  if (genMs <= 0) return "—";
  return `${f1(output / (genMs / 1000))} tok/s`;
}

export function formatCost(total: number): string {
  return total < 0.005 ? "" : `$${f2(total)}`;
}

export function formatOutbound(tokens: number): string {
  return `${DOWN}${formatTokens(tokens)}`;
}

export function formatInboundOutbound(input: number, output: number): string {
  const inbound = formatTokens(input);
  const outbound = formatTokens(output);
  if (inbound === "" && outbound === "") return "";
  if (inbound === "") return formatOutbound(output);
  if (outbound === "") return `${UP}${inbound}`;
  return `${UP}${inbound} ${DOWN}${outbound}`;
}

type UsageItem = { id: string; usage: AssistantUsage };

type AssistantItem = Extract<TranscriptItem, { kind: "assistant" }>;

function usageOf(item: TranscriptItem): AssistantUsage | undefined {
  return item.kind === "assistant" || item.kind === "tool"
    ? item.usage
    : undefined;
}

function sumBy<T>(rows: readonly T[], pick: (row: T) => number): number {
  return rows.reduce((acc, row) => acc + pick(row), 0);
}

function usageItems(items: readonly TranscriptItem[]): UsageItem[] {
  const out: UsageItem[] = [];
  for (const item of items) {
    const usage = usageOf(item);
    if (usage !== undefined) out.push({ id: item.id, usage });
  }
  return out;
}

function figuresOf(
  used: readonly UsageItem[],
): Omit<StatsFigures, "durMs"> & { endTs: number } {
  const last = used[used.length - 1];
  return {
    input: sumBy(used, (a) => a.usage.input),
    output: sumBy(used, (a) => a.usage.output),
    cost: sumBy(used, (a) => a.usage.cost),

    tpsOutput: last.usage.output,
    genMs: last.usage.genMs,
    endTs: Math.max(...used.map((a) => a.usage.endTs)),
  };
}

interface TurnAccumulator {
  startTs?: number;
  used: UsageItem[];

  footerId?: string;
  streaming: boolean;
  runningTools: number;
}

function newTurn(startTs?: number): TurnAccumulator {
  return { startTs, used: [], streaming: false, runningTools: 0 };
}

function statsOfTurn(turn: TurnAccumulator): TurnStats | null {
  if (turn.used.length === 0) return null;
  const figures = figuresOf(turn.used);
  const startTs =
    turn.startTs ?? Math.min(...turn.used.map((a) => a.usage.startTs));
  return {
    input: figures.input,
    output: figures.output,
    cost: figures.cost,
    durMs: Math.max(0, figures.endTs - startTs),
    tpsOutput: figures.tpsOutput,
    genMs: figures.genMs,

    settled: !turn.streaming && turn.runningTools === 0,
  };
}

export function turnStatsById(
  items: readonly TranscriptItem[],
): Map<string, TurnStats> {
  const out = new Map<string, TurnStats>();
  let turn = newTurn();
  const flush = (): void => {
    const stats = statsOfTurn(turn);
    if (stats !== null && turn.footerId !== undefined)
      out.set(turn.footerId, stats);
    turn = newTurn();
  };
  for (const item of items) {
    if (item.kind === "user") {
      flush();
      turn = newTurn(item.ts);
      continue;
    }
    if (item.kind === "assistant") {
      if (turn.startTs === undefined && item.usage !== undefined)
        turn.startTs = item.usage.startTs;
      if (item.streaming) turn.streaming = true;
      const usage = item.usage;
      if (usage !== undefined) {
        turn.used.push({ id: item.id, usage });

        turn.footerId = item.id;
      }
      continue;
    }
    if (item.kind === "tool") {
      if (turn.startTs === undefined && item.startTs !== undefined)
        turn.startTs = item.startTs;
      if (item.status === "running") turn.runningTools += 1;
      const usage = item.usage;

      if (usage !== undefined) turn.used.push({ id: item.id, usage });
    }
  }
  flush();
  return out;
}

export function conversationStats(
  items: readonly TranscriptItem[],

  sessionStartTs?: number,
): ConversationStats | null {
  const used = usageItems(items);
  if (used.length === 0) return null;
  const starts: number[] = [];
  for (const item of items) {
    if (item.kind === "user" && item.ts !== undefined) starts.push(item.ts);
    if (item.kind === "assistant" && item.usage !== undefined)
      starts.push(item.usage.startTs);
    if (item.kind === "tool" && item.startTs !== undefined)
      starts.push(item.startTs);
  }
  const figures = figuresOf(used);
  const startTs =
    sessionStartTs ??
    (starts.length > 0 ? Math.min(...starts) : used[0].usage.startTs);
  return {
    turns: used.length,
    input: figures.input,
    output: figures.output,
    cost: figures.cost,
    durMs: Math.max(0, figures.endTs - startTs),
    tpsOutput: figures.tpsOutput,
    genMs: figures.genMs,
  };
}
