import {
  nextItemId,
  type AssistantUsage,
  type TranscriptAction,
} from "./transcriptState";
import type { ToolImage } from "./content";
import { resultParts } from "./toolOutput";

export interface MapEventContext {
  lastAssistantId?: string;

  toolText?: Map<string, string>;

  /** Shape of the arguments seen so far for each call that is streaming in. */
  toolCallArgs?: Map<string, string>;

  thinkingBlocks?: Map<string, number>;
}

type AnyEvent = { type: string } & Record<string, unknown>;

interface AssistantMessageEventShape {
  type?: string;
  delta?: string;
  contentIndex?: number;
}

interface PartialToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

const asString = (v: unknown): string => (typeof v === "string" ? v : "");
const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? (v as string[]) : [];
const asRecord = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
const asNumber = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

/**
 * Whether the session ran this call on behalf of another tool — a codemode
 * script's own tool calls. They never reach the model as tool calls, so the log
 * keeps them out of the transcript: pi records them on the parent's result and
 * draws them inside its row.
 */
const isNestedCall = (e: AnyEvent): boolean => asString(e.parentToolCallId) !== "";

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

function toolCallArgsOf(ctx: MapEventContext): Map<string, string> {
  return (ctx.toolCallArgs ??= new Map());
}

/**
 * The tool call block being streamed: the same block pi is parsing the
 * arguments of, read out of the partial assistant message the event carries.
 */
function partialToolCallOf(
  e: AnyEvent,
  am: AssistantMessageEventShape,
): PartialToolCall | undefined {
  const content = asRecord(e.message).content;
  const blocks = Array.isArray(content)
    ? (content as Record<string, unknown>[])
    : [];
  const index = am.contentIndex ?? -1;
  let block = index >= 0 && index < blocks.length ? blocks[index] : undefined;
  if (block === undefined)
    for (let i = blocks.length - 1; i >= 0; i--)
      if (blocks[i]?.type === "toolCall") {
        block = blocks[i];
        break;
      }
  if (!block || block.type !== "toolCall") return undefined;
  const id = asString(block.id);
  if (id === "") return undefined;
  return { id, name: asString(block.name), args: asRecord(block.arguments) };
}

/**
 * A fingerprint of the arguments — key names and the length of every string —
 * so a row is redrawn when a call grows and not on each of its deltas' bytes.
 */
function argsShape(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(
      ([key, value]) =>
        `${key}:${typeof value === "string" ? value.length : typeof value}`,
    )
    .join("|");
}

function messageStart(e: AnyEvent, ctx: MapEventContext): TranscriptAction[] {
  if (asRecord(e.message).role !== "assistant") return [];
  // Every row of the log — a live one and one restored from the session file —
  // takes its id from the same counter, so a resumed session's rows and the
  // rows of the run that continues it can never share a key.
  const id = nextItemId("assistant");
  ctx.lastAssistantId = id;
  // The row is timed from the moment pi opened the message, so a decode can be
  // measured while it runs and not only once its usage lands at its end.
  const startTs = asNumber(asRecord(e.message).timestamp) || Date.now();
  return [{ type: "assistant_start", id, startTs }];
}

function thinkingStart(id: string, ctx: MapEventContext): TranscriptAction[] {
  const blocks = (ctx.thinkingBlocks ??= new Map());
  const seen = blocks.get(id) ?? 0;
  blocks.set(id, seen + 1);

  return seen > 0 ? [{ type: "assistant_thinking", id, delta: "\n\n" }] : [];
}

function toolCallStreaming(
  e: AnyEvent,
  am: AssistantMessageEventShape,
  ctx: MapEventContext,
): TranscriptAction[] {
  const call = partialToolCallOf(e, am);
  if (call === undefined) return [];
  const ledger = toolCallArgsOf(ctx);
  const shape = `${call.name}|${argsShape(call.args)}`;
  const seen = ledger.get(call.id);
  if (seen === shape) return [];
  // Some providers name the call only in its first delta, so the row opens
  // when there is a tool to name it after.
  if (seen === undefined && call.name === "") return [];
  ledger.set(call.id, shape);
  return [
    {
      type: "tool_call",
      toolCallId: call.id,
      name: call.name,
      args: call.args,
      ...(seen === undefined ? { startTs: Date.now() } : {}),
    },
  ];
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
  const am = asRecord(e.assistantMessageEvent) as AssistantMessageEventShape;
  // Arguments arrive before the tool runs: the row opens and grows with them.
  if (am.type === "toolcall_start" || am.type === "toolcall_delta")
    return toolCallStreaming(e, am, ctx);
  const id = ctx.lastAssistantId;
  if (id === undefined) return [];
  return assistantSubEvent(am, id, ctx);
}

function messageEnd(e: AnyEvent, ctx: MapEventContext): TranscriptAction[] {
  const msg = asRecord(e.message);
  if (msg.role !== "assistant") return [];
  ctx.toolCallArgs?.clear();
  if (!ctx.lastAssistantId) return [];
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
  if (isNestedCall(e)) return [];
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
  if (isNestedCall(e)) return [];
  const toolCallId = asString(e.toolCallId);
  const { output: text, details } = resultParts(e.partialResult);
  const ledger = toolTextOf(ctx);
  const prev = ledger.get(toolCallId) ?? "";
  ledger.set(toolCallId, text);
  const delta = text.startsWith(prev)
    ? text.slice(prev.length)
    : text === prev
      ? ""
      : text;
  // A call can publish only details — a codemode script answers with its nested
  // calls as it makes them and no output until it ends.
  if (delta === "" && details === undefined) return [];
  return [
    {
      type: "tool_update",
      toolCallId,
      delta,
      ...(details === undefined ? {} : { details }),
    },
  ];
}

function toolEnd(e: AnyEvent, ctx: MapEventContext): TranscriptAction[] {
  if (isNestedCall(e)) return [];
  const toolCallId = asString(e.toolCallId);
  const { output, details, image } = resultParts(e.result);
  toolTextOf(ctx).set(toolCallId, output);
  ctx.toolCallArgs?.delete(toolCallId);
  return [
    {
      type: "tool_end",
      toolCallId,
      ok: !e.isError,
      output,
      details,
      image: image as ToolImage | undefined,
      endTs: Date.now(),
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
