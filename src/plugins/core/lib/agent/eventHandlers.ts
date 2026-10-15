import type { AssistantUsage, TranscriptAction } from "./transcriptState";
import type { ToolImage } from "./content";
import { resultParts } from "./toolOutput";

export interface MapEventContext {
  lastAssistantId?: string;

  assistantSeq?: number;

  toolText?: Map<string, string>;

  thinkingBlocks?: Map<string, number>;
}

type AnyEvent = { type: string } & Record<string, unknown>;

interface AssistantMessageEventShape {
  type?: string;
  delta?: string;
}

const asString = (v: unknown): string => (typeof v === "string" ? v : "");
const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? (v as string[]) : [];
const asRecord = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
const asNumber = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

function assistantUsageOf(
  message: Record<string, unknown>,
  endTs: number,
): AssistantUsage | undefined {
  const usage = asRecord(message.usage);
  if (Object.keys(usage).length === 0) return undefined;
  const cost = asRecord(usage.cost);
  const startTs = asNumber(message.timestamp) || endTs;
  const genMs = asNumber(message.durationMs) || Math.max(0, endTs - startTs);
  return {
    input: asNumber(usage.input),
    output: asNumber(usage.output),
    cost: asNumber(cost.total),
    genMs,
    startTs,
    endTs: startTs + genMs,
  };
}

function toolTextOf(ctx: MapEventContext): Map<string, string> {
  return (ctx.toolText ??= new Map());
}

function messageStart(e: AnyEvent, ctx: MapEventContext): TranscriptAction[] {
  if (asRecord(e.message).role !== "assistant") return [];
  ctx.assistantSeq = (ctx.assistantSeq ?? 0) + 1;
  const id = `assistant-${ctx.assistantSeq}`;
  ctx.lastAssistantId = id;
  return [{ type: "assistant_start", id }];
}

function thinkingStart(id: string, ctx: MapEventContext): TranscriptAction[] {
  const blocks = (ctx.thinkingBlocks ??= new Map());
  const seen = blocks.get(id) ?? 0;
  blocks.set(id, seen + 1);

  return seen > 0 ? [{ type: "assistant_thinking", id, delta: "\n\n" }] : [];
}

function assistantSubEvent(
  am: AssistantMessageEventShape,
  id: string,
  ctx: MapEventContext,
): TranscriptAction[] {
  if (am.type === "thinking_start") return thinkingStart(id, ctx);
  if (typeof am.delta !== "string") return [];
  if (am.type === "text_delta")
    return [{ type: "assistant_delta", id, delta: am.delta }];
  if (am.type === "thinking_delta")
    return [{ type: "assistant_thinking", id, delta: am.delta }];
  return [];
}

function messageUpdate(e: AnyEvent, ctx: MapEventContext): TranscriptAction[] {
  const id = ctx.lastAssistantId;
  if (id === undefined) return [];
  return assistantSubEvent(
    asRecord(e.assistantMessageEvent) as AssistantMessageEventShape,
    id,
    ctx,
  );
}

function messageEnd(e: AnyEvent, ctx: MapEventContext): TranscriptAction[] {
  const msg = asRecord(e.message);
  if (msg.role !== "assistant" || !ctx.lastAssistantId) return [];
  const id = ctx.lastAssistantId;
  ctx.lastAssistantId = undefined;
  const usage = assistantUsageOf(msg, Date.now());
  return [
    {
      type: "assistant_end",
      id,
      stopReason: typeof msg.stopReason === "string" ? msg.stopReason : "stop",
      ...(usage === undefined ? {} : { usage }),
    },
  ];
}

function toolStart(e: AnyEvent, ctx: MapEventContext): TranscriptAction[] {
  const toolCallId = asString(e.toolCallId);
  toolTextOf(ctx).set(toolCallId, "");
  return [
    {
      type: "tool_start",
      toolCallId,
      name: asString(e.toolName),
      args: asRecord(e.args),
      startTs: Date.now(),
    },
  ];
}

function toolUpdate(e: AnyEvent, ctx: MapEventContext): TranscriptAction[] {
  const toolCallId = asString(e.toolCallId);
  const text = resultParts(e.partialResult).output;
  const ledger = toolTextOf(ctx);
  const prev = ledger.get(toolCallId) ?? "";
  ledger.set(toolCallId, text);
  const delta = text.startsWith(prev)
    ? text.slice(prev.length)
    : text === prev
      ? ""
      : text;
  return delta ? [{ type: "tool_update", toolCallId, delta }] : [];
}

function toolEnd(e: AnyEvent, ctx: MapEventContext): TranscriptAction[] {
  const toolCallId = asString(e.toolCallId);
  const { output, details, image } = resultParts(e.result);
  toolTextOf(ctx).set(toolCallId, output);
  return [
    {
      type: "tool_end",
      toolCallId,
      ok: !e.isError,
      output,
      details,
      image: image as ToolImage | undefined,
    },
  ];
}

function compactionEnd(e: AnyEvent): TranscriptAction[] {
  if (e.aborted) return [{ type: "system", text: "Compaction aborted" }];
  const error = asString(e.errorMessage);
  if (error) return [{ type: "system", text: `Compaction failed: ${error}` }];
  return [{ type: "system", text: "Context compacted" }];
}

function retryStart(e: AnyEvent): TranscriptAction[] {
  return [
    {
      type: "system",
      text: `Retrying (${e.attempt}/${e.maxAttempts}) after: ${asString(e.errorMessage)}`,
    },
  ];
}

function retryEnd(e: AnyEvent): TranscriptAction[] {
  if (e.success) return [];
  const error = asString(e.finalError);
  return [{ type: "system", text: `Retry failed${error ? `: ${error}` : ""}` }];
}

const EVENT_HANDLERS: Record<
  string,
  (e: AnyEvent, ctx: MapEventContext) => TranscriptAction[]
> = {
  message_start: messageStart,
  message_update: messageUpdate,
  message_end: messageEnd,
  tool_execution_start: toolStart,
  tool_execution_update: toolUpdate,
  tool_execution_end: toolEnd,
  agent_settled: (e) => [{ type: "settled", aborted: Boolean(e.aborted) }],
  queue_update: (e) => [
    {
      type: "queue",
      steering: [...asStringArray(e.steering)],
      followUp: [...asStringArray(e.followUp)],
    },
  ],
  compaction_start: (e) => [
    { type: "system", text: `Compacting context (${asString(e.reason)})…` },
  ],
  compaction_end: (e) => compactionEnd(e),
  auto_retry_start: retryStart,
  auto_retry_end: retryEnd,
};

export function eventActions(
  event: unknown,
  ctx: MapEventContext,
): TranscriptAction[] {
  const e = event as AnyEvent;
  const handler = EVENT_HANDLERS[e.type];
  return handler ? handler(e, ctx) : [];
}
