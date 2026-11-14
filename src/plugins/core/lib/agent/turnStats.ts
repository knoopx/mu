import type { AssistantUsage, TranscriptItem } from "./transcriptState";

export const UP = "↑";
export const DOWN = "↓";
export const DOT = "·";
export const BAR = "|";

const CHARS_PER_TOKEN = 4;

const LIVE_MIN_MS = 250;

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

  live: boolean;
}

export interface SessionClock {
  now: number;

  running: boolean;
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
  const inbound = input === 0 ? "" : formatTokens(input);
  const outbound = output === 0 ? "" : formatTokens(output);
  if (inbound === "" && outbound === "") return "";
  if (inbound === "") return formatOutbound(output);
  if (outbound === "") return `${UP}${inbound}`;
  return `${UP}${inbound} ${DOWN}${outbound}`;
}

type UsageItem = { id: string; usage: AssistantUsage };

type AssistantItem = Extract<TranscriptItem, { kind: "assistant" }>;

type ToolItem = Extract<TranscriptItem, { kind: "tool" }>;

function usageOf(item: TranscriptItem): AssistantUsage | undefined {
  return item.kind === "assistant" || item.kind === "tool"
    ? item.usage
    : undefined;
}

function startTsOf(item: TranscriptItem): number | undefined {
  if (item.kind === "user") return item.ts;
  if (item.kind === "assistant" || item.kind === "tool")
    return item.startTs ?? item.usage?.startTs;
  return undefined;
}

function sumBy<T>(rows: readonly T[], pick: (row: T) => number): number {
  return rows.reduce((acc, row) => acc + pick(row), 0);
}

function tokensOf(chars: number): number {
  return Math.round(chars / CHARS_PER_TOKEN);
}

interface LiveDecode {
  startTs: number | undefined;

  chars: number;
}

interface Scan {
  used: UsageItem[];

  decode: LiveDecode | null;

  endTs: number;

  runningTools: number;
}

function scan(items: readonly TranscriptItem[]): Scan {
  const used: UsageItem[] = [];
  let decode: LiveDecode | null = null;
  let endTs = 0;
  let runningTools = 0;
  for (const item of items) {
    const usage = usageOf(item);
    if (usage !== undefined) {
      used.push({ id: item.id, usage });
      if (usage.endTs > endTs) endTs = usage.endTs;
    }
    if (item.kind === "assistant") {
      if (item.streaming)
        decode = { startTs: item.startTs, chars: streamedCharsOf(item) };
      continue;
    }
    if (item.kind !== "tool") continue;
    if (item.status === "running") {
      runningTools += 1;
      if (decode !== null)
        decode = { ...decode, chars: decode.chars + callCharsOf(item) };
    } else if (item.endTs !== undefined && item.endTs > endTs) {
      endTs = item.endTs;
    }
  }
  return { used, decode, endTs, runningTools };
}

function earliestStartOf(items: readonly TranscriptItem[]): number | undefined {
  let earliest: number | undefined;
  for (const item of items) {
    const ts = startTsOf(item);
    if (ts === undefined || ts <= 0) continue;
    if (earliest === undefined || ts < earliest) earliest = ts;
  }
  return earliest;
}

function streamedCharsOf(item: AssistantItem): number {
  return item.text.length + (item.reasoning?.length ?? 0);
}

function callCharsOf(item: ToolItem): number {
  return JSON.stringify(item.args).length;
}

interface Measured {
  input: number;

  output: number;

  cost: number;

  tpsOutput: number;

  genMs: number;

  endTs: number;

  live: boolean;
}

function liveRateOf(
  decode: LiveDecode,
  now: number,
): { tpsOutput: number; genMs: number } | null {
  if (decode.startTs === undefined) return null;
  const genMs = now - decode.startTs;
  if (decode.chars === 0 || genMs < LIVE_MIN_MS) return null;
  return { tpsOutput: tokensOf(decode.chars), genMs };
}

function measuredOf(rows: Scan, now: number): Measured {
  const { used, decode } = rows;
  const last = used[used.length - 1];
  const rate = decode === null ? null : liveRateOf(decode, now);
  return {
    input: sumBy(used, (a) => a.usage.input),
    output:
      sumBy(used, (a) => a.usage.output) +
      (decode === null ? 0 : tokensOf(decode.chars)),
    cost: sumBy(used, (a) => a.usage.cost),
    tpsOutput: rate?.tpsOutput ?? last?.usage.output ?? 0,
    genMs: rate?.genMs ?? last?.usage.genMs ?? 0,

    endTs: decode === null ? rows.endTs : Math.max(rows.endTs, now),
    live: decode !== null,
  };
}

function sessionSpanOf(
  items: readonly TranscriptItem[],
  figures: Measured,
  clock: SessionClock,
  sessionStart: number | undefined,
): number {
  const startTs = earliestStartOf(items) ?? sessionStart ?? figures.endTs;
  const endTs = clock.running
    ? Math.max(figures.endTs, clock.now)
    : figures.endTs;
  return Math.max(0, endTs - startTs);
}

interface Turn {
  startTs?: number;
  rows: TranscriptItem[];

  footerId?: string;
}

function statsOfTurn(turn: Turn): TurnStats | null {
  const rows = scan(turn.rows);
  if (rows.used.length === 0) return null;

  const figures = measuredOf({ ...rows, decode: null }, 0);
  const startTs =
    turn.startTs ?? earliestStartOf(turn.rows) ?? rows.used[0].usage.startTs;
  return {
    input: figures.input,
    output: figures.output,
    cost: figures.cost,
    durMs: Math.max(0, figures.endTs - startTs),
    tpsOutput: figures.tpsOutput,
    genMs: figures.genMs,

    settled: rows.decode === null && rows.runningTools === 0,
  };
}

const statsCache = new Map<string, TurnStats>();

const STATS_CACHE_MAX = 1_024;

function sameStats(a: TurnStats, b: TurnStats): boolean {
  return (
    a.settled === b.settled &&
    a.input === b.input &&
    a.output === b.output &&
    a.cost === b.cost &&
    a.durMs === b.durMs &&
    a.tpsOutput === b.tpsOutput &&
    a.genMs === b.genMs
  );
}

function rememberedStats(footerId: string, stats: TurnStats): TurnStats {
  const previous = statsCache.get(footerId);
  if (previous !== undefined && sameStats(previous, stats)) return previous;
  if (statsCache.size >= STATS_CACHE_MAX) statsCache.clear();
  statsCache.set(footerId, stats);
  return stats;
}

export function turnStatsById(
  items: readonly TranscriptItem[],
): Map<string, TurnStats> {
  const out = new Map<string, TurnStats>();
  let turn: Turn = { rows: [] };
  const flush = (): void => {
    const stats = statsOfTurn(turn);
    if (stats !== null && turn.footerId !== undefined)
      out.set(turn.footerId, rememberedStats(turn.footerId, stats));
    turn = { rows: [] };
  };
  for (const item of items) {
    if (item.kind === "user") {
      flush();
      turn = {
        rows: [],
        ...(item.ts === undefined ? {} : { startTs: item.ts }),
      };
      continue;
    }
    turn.rows.push(item);

    if (item.kind === "assistant" && item.usage !== undefined)
      turn.footerId = item.id;
    if (turn.startTs === undefined) {
      const ts = startTsOf(item);
      if (ts !== undefined) turn.startTs = ts;
    }
  }
  flush();
  return out;
}

export function conversationStats(
  items: readonly TranscriptItem[],
  clock: SessionClock,
  sessionStart?: number,
): ConversationStats | null {
  const rows = scan(items);
  if (rows.used.length === 0 && rows.decode === null) return null;
  const figures = measuredOf(rows, clock.now);
  return {
    turns: rows.used.length + (rows.decode === null ? 0 : 1),
    input: figures.input,
    output: figures.output,
    cost: figures.cost,
    durMs: sessionSpanOf(items, figures, clock, sessionStart),
    tpsOutput: figures.tpsOutput,
    genMs: figures.genMs,

    live: figures.live,
  };
}
