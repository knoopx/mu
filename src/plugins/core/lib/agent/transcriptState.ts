import { useReducer, type Dispatch } from "react";
import {
  contentToText,
  joinTextParts,
  toolImageOf,
  toolImagesOf,
  type ToolImage,
} from "./content";

export interface AssistantUsage {
  input: number;

  output: number;

  cost: number;

  genMs: number;

  startTs: number;

  endTs: number;
}

export type TranscriptItem =
  | {
      kind: "user";
      id: string;
      text: string;
      ts?: number;

      images?: ToolImage[];
    }
  | {
      kind: "assistant";
      id: string;
      text: string;
      streaming: boolean;

      /** When the decode began — the only clock a message streaming has, since
       * its usage arrives with its end. */
      startTs?: number;
      stopReason?: string;
      reasoning?: string;

      usage?: AssistantUsage;
    }
  | {
      kind: "tool";
      id: string;
      toolCallId: string;
      startTs?: number;

      /** When the call finished running — the last activity of a turn whose
       * answer came before it. */
      endTs?: number;

      usage?: AssistantUsage;
      name: string;
      args: Record<string, unknown>;
      status: "running" | "ok" | "error";
      output: string;

      details?: unknown;

      image?: ToolImage;
    }
  | { kind: "system"; id: string; text: string };

/** The one tool row of the transcript: what every tool view is drawn from. */
export type ToolTranscriptItem = Extract<TranscriptItem, { kind: "tool" }>;

export type TranscriptAction =
  | { type: "user"; text: string; ts?: number; images?: ToolImage[] }
  | { type: "assistant_start"; id: string; startTs?: number }
  | { type: "assistant_delta"; id: string; delta: string }
  | { type: "assistant_thinking"; id: string; delta: string }
  | {
      type: "assistant_end";
      id: string;
      stopReason: string;
      usage?: AssistantUsage;
    }
  | {
      type: "tool_start";
      toolCallId: string;
      name: string;
      args: Record<string, unknown>;
      startTs?: number;
    }
  | {
      /**
       * The model has opened a call and its arguments are still arriving, so a
       * row exists — and grows — before the tool runs.
       */
      type: "tool_call";
      toolCallId: string;
      name: string;
      args: Record<string, unknown>;
      startTs?: number;
    }
  | {
      type: "tool_update";
      toolCallId: string;
      delta: string;

      details?: unknown;
    }
  | {
      type: "tool_end";
      toolCallId: string;
      ok: boolean;
      output: string;
      details?: unknown;
      image?: ToolImage;
      endTs?: number;
    }
  | { type: "tool_usage"; toolCallId: string; usage: AssistantUsage }
  | { type: "system"; text: string }
  | { type: "settled"; aborted: boolean }
  | { type: "queue"; steering: string[]; followUp: string[] }
  | { type: "clear" }
  | { type: "restore"; items: TranscriptItem[] };

export interface TranscriptState {
  items: TranscriptItem[];
  isStreaming: boolean;
  queue: { steering: string[]; followUp: string[] };
}

export interface TranscriptStateApi extends TranscriptState {
  dispatch: Dispatch<TranscriptAction>;
}

let seq = 0;

/**
 * A tool row opened before its arguments land: keyed by the call, running, and
 * empty of output. Both the streaming call and the start of execution open it,
 * so the row the model grows and the row the tool completes are one shape.
 */
function runningToolItem(action: {
  toolCallId: string;
  name: string;
  args: Record<string, unknown>;
  startTs?: number;
}): ToolTranscriptItem {
  return {
    kind: "tool",
    id: action.toolCallId,
    toolCallId: action.toolCallId,
    name: action.name,
    args: action.args,
    status: "running",
    output: "",
    details: undefined,
    ...(action.startTs === undefined ? {} : { startTs: action.startTs }),
  };
}

export function nextItemId(
  kind: "user" | "assistant" | "system" | "tool",
): string {
  return `${kind}-${++seq}`;
}

export function createTranscriptState(
  items: TranscriptItem[] = [],
  isStreaming = false,
): TranscriptState {
  return { items, isStreaming, queue: { steering: [], followUp: [] } };
}

function findToolIndex(items: TranscriptItem[], toolCallId: string): number {
  return items.findIndex(
    (it) => it.kind === "tool" && it.toolCallId === toolCallId,
  );
}

type ActionOf<T extends TranscriptAction["type"]> = Extract<
  TranscriptAction,
  { type: T }
>;

type AssistantItem = Extract<TranscriptItem, { kind: "assistant" }>;

/** Rewrite the one assistant row of a turn; every other row is passed through. */
function rewriteAssistant(
  state: TranscriptState,
  id: string,
  rewrite: (item: AssistantItem) => AssistantItem,
): TranscriptState {
  return {
    ...state,
    items: state.items.map((item) =>
      item.kind === "assistant" && item.id === id ? rewrite(item) : item,
    ),
  };
}

/** Rewrite the tool rows a selector names; every other row is passed through. */
function rewriteTool(
  state: TranscriptState,
  selected: (item: ToolTranscriptItem) => boolean,
  rewrite: (item: ToolTranscriptItem) => ToolTranscriptItem,
): TranscriptState {
  return {
    ...state,
    items: state.items.map((item) =>
      item.kind === "tool" && selected(item) ? rewrite(item) : item,
    ),
  };
}

const appendRow = (
  state: TranscriptState,
  item: TranscriptItem,
): TranscriptState => ({ ...state, items: [...state.items, item] });

const appendUser = (
  state: TranscriptState,
  action: ActionOf<"user">,
): TranscriptState =>
  appendRow(state, {
    kind: "user",
    id: nextItemId("user"),
    text: action.text,
    ...(action.ts === undefined ? {} : { ts: action.ts }),
    ...(action.images === undefined || action.images.length === 0
      ? {}
      : { images: action.images }),
  });

const appendSystem = (
  state: TranscriptState,
  action: ActionOf<"system">,
): TranscriptState =>
  appendRow(state, {
    kind: "system",
    id: nextItemId("system"),
    text: action.text,
  });

const startAssistant = (
  state: TranscriptState,
  action: ActionOf<"assistant_start">,
): TranscriptState => ({
  ...state,
  isStreaming: true,
  items: [
    ...state.items,
    {
      kind: "assistant",
      id: action.id,
      text: "",
      streaming: true,
      ...(action.startTs === undefined ? {} : { startTs: action.startTs }),
    },
  ],
});

const assistantDelta = (
  state: TranscriptState,
  action: ActionOf<"assistant_delta">,
): TranscriptState =>
  rewriteAssistant(state, action.id, (item) => ({
    ...item,
    text: item.text + action.delta,
    streaming: true,
  }));

const assistantThinking = (
  state: TranscriptState,
  action: ActionOf<"assistant_thinking">,
): TranscriptState =>
  rewriteAssistant(state, action.id, (item) => ({
    ...item,
    reasoning: (item.reasoning ?? "") + action.delta,
    streaming: true,
  }));

const assistantEnd = (
  state: TranscriptState,
  action: ActionOf<"assistant_end">,
): TranscriptState =>
  rewriteAssistant(state, action.id, (item) => ({
    ...item,
    streaming: false,
    stopReason: action.stopReason,
    usage: action.usage !== undefined ? action.usage : item.usage,
  }));

/**
 * A call is still being written: the first delta opens the row, the next ones
 * fill in the arguments as they land. A row that already finished running is
 * never reopened.
 */
function openToolCall(
  state: TranscriptState,
  action: ActionOf<"tool_call">,
): TranscriptState {
  const at = findToolIndex(state.items, action.toolCallId);
  if (at < 0)
    return {
      ...state,
      isStreaming: true,
      items: [...state.items, runningToolItem(action)],
    };
  const opened = state.items[at] as ToolTranscriptItem;
  if (opened.status !== "running") return state;
  const items = state.items.slice();
  items[at] = {
    ...opened,
    name: action.name === "" ? opened.name : action.name,
    args: action.args,
  };
  return { ...state, items };
}

function startTool(
  state: TranscriptState,
  action: ActionOf<"tool_start">,
): TranscriptState {
  const at = findToolIndex(state.items, action.toolCallId);
  // The row is already there when the call streamed in, so execution
  // completes it with the full arguments instead of opening a second row.
  if (at < 0)
    return {
      ...state,
      isStreaming: true,
      items: [...state.items, runningToolItem(action)],
    };
  const started = state.items[at] as ToolTranscriptItem;
  const items = state.items.slice();
  items[at] = {
    ...started,
    name: action.name === "" ? started.name : action.name,
    args: action.args,
    ...(action.startTs === undefined ? {} : { startTs: action.startTs }),
  };
  return { ...state, isStreaming: true, items };
}

const toolUpdate = (
  state: TranscriptState,
  action: ActionOf<"tool_update">,
): TranscriptState =>
  rewriteTool(
    state,
    (item) =>
      item.toolCallId === action.toolCallId && item.status === "running",
    (item) => ({
      ...item,
      output: item.output + action.delta,
      ...(action.details === undefined ? {} : { details: action.details }),
    }),
  );

const toolEnd = (
  state: TranscriptState,
  action: ActionOf<"tool_end">,
): TranscriptState =>
  rewriteTool(
    state,
    (item) => item.toolCallId === action.toolCallId,
    (item) => ({
      ...item,
      status: action.ok ? "ok" : "error",
      output: action.output || item.output,
      details: action.details !== undefined ? action.details : item.details,
      image: action.image !== undefined ? action.image : item.image,
      ...(action.endTs === undefined ? {} : { endTs: action.endTs }),
    }),
  );

const toolUsage = (
  state: TranscriptState,
  action: ActionOf<"tool_usage">,
): TranscriptState =>
  rewriteTool(
    state,
    (item) => item.toolCallId === action.toolCallId && item.usage === undefined,
    (item) => ({ ...item, usage: action.usage }),
  );

/** The run is over: a streaming turn and a running row are both cut short. */
function settleItem(item: TranscriptItem, aborted: boolean): TranscriptItem {
  if (item.kind === "assistant" && item.streaming)
    return { ...item, streaming: false, stopReason: "aborted" };
  if (item.kind !== "tool" || item.status !== "running") return item;
  if (item.output !== "") return { ...item, status: "error" };
  // A row opened by a call that never ran has nothing to show but why it stopped.
  return {
    ...item,
    status: "error",
    output: aborted ? "Interrupted before it ran" : "Never ran",
  };
}

const settleRun = (
  state: TranscriptState,
  action: ActionOf<"settled">,
): TranscriptState => ({
  ...state,
  isStreaming: false,
  items: state.items.map((item) => settleItem(item, action.aborted)),
});

export function transcriptReducer(
  state: TranscriptState,
  action: TranscriptAction,
): TranscriptState {
  switch (action.type) {
    case "user":
      return appendUser(state, action);
    case "assistant_start":
      return startAssistant(state, action);
    case "assistant_delta":
      return assistantDelta(state, action);
    case "assistant_thinking":
      return assistantThinking(state, action);
    case "assistant_end":
      return assistantEnd(state, action);
    case "tool_call":
      return openToolCall(state, action);
    case "tool_start":
      return startTool(state, action);
    case "tool_update":
      return toolUpdate(state, action);
    case "tool_end":
      return toolEnd(state, action);
    case "tool_usage":
      return toolUsage(state, action);
    case "system":
      return appendSystem(state, action);
    case "settled":
      return settleRun(state, action);
    case "queue":
      return {
        ...state,
        queue: { steering: action.steering, followUp: action.followUp },
      };
    case "clear":
      return { ...state, items: [] };
    case "restore":
      return { ...state, items: action.items };
  }
}

interface SessionMessagePart {
  type?: string;
  id?: string;
  name?: string;
  thinking?: string;
  arguments?: Record<string, unknown>;
}

interface SessionUsage {
  input?: number;
  output?: number;
  cost?: { total?: number };
}

interface SessionMessage {
  role?: string;
  content?: unknown;
  details?: unknown;
  isError?: boolean;
  toolCallId?: string;

  timestamp?: number;

  durationMs?: number;

  usage?: SessionUsage;
}

const num = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

function assistantUsageOf(m: SessionMessage): AssistantUsage | undefined {
  const usage = m.usage;
  if (usage === undefined || usage === null) return undefined;
  const startTs = num(m.timestamp);
  const genMs = num(m.durationMs) || Math.max(0, Date.now() - startTs);
  return {
    input: num(usage.input),
    output: num(usage.output),
    cost: num(usage.cost?.total),
    genMs,
    startTs,
    endTs: startTs + genMs,
  };
}

function thinkingOf(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return (content as SessionMessagePart[])
    .filter(
      (part) =>
        part &&
        part.type === "thinking" &&
        typeof part.thinking === "string" &&
        part.thinking !== "",
    )
    .map((part) => part.thinking as string)
    .join("\n\n");
}

interface ToolResult {
  ok: boolean;
  output: string;
  details?: unknown;
  image?: ToolImage;
  endTs?: number;
}

function indexToolResults(
  messages: readonly SessionMessage[],
): Map<string, ToolResult> {
  const results = new Map<string, ToolResult>();
  for (const m of messages) {
    if (m.role !== "toolResult" || !m.toolCallId) continue;
    const endTs = num(m.timestamp);
    results.set(m.toolCallId, {
      ok: m.isError !== true,
      output: contentToText(m.content),
      details: m.details,
      image: toolImageOf(m.content),
      ...(endTs === 0 ? {} : { endTs }),
    });
  }
  return results;
}

function userItem(m: SessionMessage): TranscriptItem | undefined {
  const text = contentToText(m.content);
  const images = toolImagesOf(m.content);
  if (text === "" && images.length === 0) return undefined;
  const ts = num(m.timestamp);
  return {
    kind: "user",
    id: nextItemId("user"),
    text,
    ...(ts === 0 ? {} : { ts }),
    ...(images.length === 0 ? {} : { images }),
  };
}

function assistantItem(m: SessionMessage): TranscriptItem | undefined {
  const text = joinTextParts(m.content, "");
  const reasoning = thinkingOf(m.content);
  if (text === "" && reasoning === "") return undefined;
  const usage = assistantUsageOf(m);
  return {
    kind: "assistant",
    id: nextItemId("assistant"),
    text,
    streaming: false,
    stopReason: "stop",
    ...(reasoning === "" ? {} : { reasoning }),
    ...(usage === undefined ? {} : { usage }),
  };
}

/** One call of an assistant message, joined to the result the session recorded for it. */
function toolItemOf(
  part: SessionMessagePart,
  toolCallId: string,
  result: ToolResult | undefined,
): ToolTranscriptItem {
  return {
    kind: "tool",
    id: toolCallId,
    toolCallId,
    name: part.name ?? "",
    args: part.arguments ?? {},
    status: result?.ok === false ? "error" : "ok",
    output: result?.output ?? "",
    details: result?.details,
    ...(result?.endTs === undefined ? {} : { endTs: result.endTs }),
    ...(result?.image === undefined ? {} : { image: result.image }),
  };
}

/** Usage belongs to the message, and a message's tokens stand beside its last call. */
function withUsage(
  items: ToolTranscriptItem[],
  usage: AssistantUsage | undefined,
): ToolTranscriptItem[] {
  const last = items[items.length - 1];
  if (usage === undefined || last === undefined) return items;
  const joined = [...items];
  joined[joined.length - 1] = { ...last, usage };
  return joined;
}

function toolItems(
  m: SessionMessage,
  results: Map<string, ToolResult>,
  usage?: AssistantUsage,
): ToolTranscriptItem[] {
  const parts = Array.isArray(m.content)
    ? (m.content as SessionMessagePart[])
    : [];
  const items: ToolTranscriptItem[] = [];
  for (const part of parts) {
    if (!part || part.type !== "toolCall" || !part.name) continue;
    const toolCallId = part.id ?? nextItemId("tool");
    items.push(toolItemOf(part, toolCallId, results.get(toolCallId)));
  }

  return withUsage(items, usage);
}

export function transcriptItemsFromMessages(
  messages: readonly unknown[],
): TranscriptItem[] {
  const parsed = messages as readonly SessionMessage[];
  const results = indexToolResults(parsed);
  const items: TranscriptItem[] = [];
  for (const m of parsed) {
    if (m.role === "user") {
      const item = userItem(m);
      if (item) items.push(item);
      continue;
    }
    if (m.role !== "assistant") continue;
    const item = assistantItem(m);
    const usage = assistantUsageOf(m);
    if (item) items.push(item);

    items.push(
      ...toolItems(m, results, item === undefined ? usage : undefined),
    );
  }
  return items;
}
export function useTranscriptState(
  initial?: TranscriptItem[],
  isStreaming = false,
): TranscriptStateApi {
  const [state, dispatch] = useReducer(transcriptReducer, initial, (items) =>
    createTranscriptState(items, isStreaming),
  );
  return { ...state, dispatch };
}
