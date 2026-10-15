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
      stopReason?: string;
      reasoning?: string;

      usage?: AssistantUsage;
    }
  | {
      kind: "tool";
      id: string;
      toolCallId: string;
      startTs?: number;

      usage?: AssistantUsage;
      name: string;
      args: Record<string, unknown>;
      status: "running" | "ok" | "error";
      output: string;

      details?: unknown;

      image?: ToolImage;
    }
  | { kind: "system"; id: string; text: string };

export type TranscriptAction =
  | { type: "user"; text: string; ts?: number; images?: ToolImage[] }
  | { type: "assistant_start"; id: string }
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
  | { type: "tool_update"; toolCallId: string; delta: string }
  | {
      type: "tool_end";
      toolCallId: string;
      ok: boolean;
      output: string;
      details?: unknown;
      image?: ToolImage;
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

function transcriptReducer(
  state: TranscriptState,
  action: TranscriptAction,
): TranscriptState {
  switch (action.type) {
    case "user":
      return {
        ...state,
        items: [
          ...state.items,
          {
            kind: "user",
            id: nextItemId("user"),
            text: action.text,
            ...(action.ts === undefined ? {} : { ts: action.ts }),
            ...(action.images === undefined || action.images.length === 0
              ? {}
              : { images: action.images }),
          },
        ],
      };
    case "assistant_start":
      return {
        ...state,
        isStreaming: true,
        items: [
          ...state.items,
          { kind: "assistant", id: action.id, text: "", streaming: true },
        ],
      };
    case "assistant_delta":
      return {
        ...state,
        items: state.items.map((it) =>
          it.kind === "assistant" && it.id === action.id
            ? { ...it, text: it.text + action.delta, streaming: true }
            : it,
        ),
      };
    case "assistant_thinking":
      return {
        ...state,
        items: state.items.map((it) =>
          it.kind === "assistant" && it.id === action.id
            ? {
                ...it,
                reasoning: (it.reasoning ?? "") + action.delta,
                streaming: true,
              }
            : it,
        ),
      };
    case "assistant_end":
      return {
        ...state,
        items: state.items.map((it) =>
          it.kind === "assistant" && it.id === action.id
            ? {
                ...it,
                streaming: false,
                stopReason: action.stopReason,
                usage: action.usage !== undefined ? action.usage : it.usage,
              }
            : it,
        ),
      };
    case "tool_start":
      return {
        ...state,
        isStreaming: true,
        items: [
          ...state.items,
          {
            kind: "tool",
            id: action.toolCallId,
            toolCallId: action.toolCallId,
            name: action.name,
            args: action.args,
            status: "running",
            output: "",
            details: undefined,
            ...(action.startTs === undefined
              ? {}
              : { startTs: action.startTs }),
          },
        ],
      };
    case "tool_update":
      return {
        ...state,
        items: state.items.map((it) =>
          it.kind === "tool" &&
          it.toolCallId === action.toolCallId &&
          it.status === "running"
            ? { ...it, output: it.output + action.delta }
            : it,
        ),
      };
    case "tool_end":
      return {
        ...state,
        items: state.items.map((it) =>
          it.kind === "tool" && it.toolCallId === action.toolCallId
            ? {
                ...it,
                status: action.ok ? "ok" : "error",
                output: action.output || it.output,
                details:
                  action.details !== undefined ? action.details : it.details,
                image: action.image !== undefined ? action.image : it.image,
              }
            : it,
        ),
      };
    case "tool_usage":
      return {
        ...state,
        items: state.items.map((it) =>
          it.kind === "tool" &&
          it.toolCallId === action.toolCallId &&
          it.usage === undefined
            ? { ...it, usage: action.usage }
            : it,
        ),
      };
    case "system":
      return {
        ...state,
        items: [
          ...state.items,
          { kind: "system", id: nextItemId("system"), text: action.text },
        ],
      };
    case "settled":
      return {
        ...state,
        isStreaming: false,

        items: state.items.map((it) =>
          it.kind === "assistant" && it.streaming
            ? { ...it, streaming: false, stopReason: "aborted" }
            : it,
        ),
      };
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
}

function indexToolResults(
  messages: readonly SessionMessage[],
): Map<string, ToolResult> {
  const results = new Map<string, ToolResult>();
  for (const m of messages) {
    if (m.role !== "toolResult" || !m.toolCallId) continue;
    results.set(m.toolCallId, {
      ok: m.isError !== true,
      output: contentToText(m.content),
      details: m.details,
      image: toolImageOf(m.content),
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

type ToolTranscriptItem = Extract<TranscriptItem, { kind: "tool" }>;

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
    const result = results.get(toolCallId);
    items.push({
      kind: "tool",
      id: toolCallId,
      toolCallId,
      name: part.name,
      args: part.arguments ?? {},
      status: result?.ok === false ? "error" : "ok",
      output: result?.output ?? "",
      details: result?.details,
      ...(result?.image === undefined ? {} : { image: result.image }),
    });
  }

  const last = items[items.length - 1];
  if (usage !== undefined && last !== undefined)
    items[items.length - 1] = { ...last, usage };
  return items;
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
