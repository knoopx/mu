import type {
  SessionEntry,
  SessionInfo,
  SessionTreeNode,
} from "@earendil-works/pi-coding-agent";
import { AgentBridge } from "../agent/agentService";
import { contentToText } from "../agent/content";
import type { TranscriptItem } from "../agent/transcriptState";
import { useCachedResource } from "../../hooks/useCachedResource";
import {
  firstLine,
  singleLine,
  truncateToWidth,
} from "../../../../utils/truncate";
import { byRecentSession } from "../session/sessionList";
import { cappedPanelStatusText, matchesQuery } from "./options";
import type { ComposerPanelRow } from "../../components/composer/Composer";

export const USER_MESSAGE_HISTORY_CAP = 400;

export const USER_MESSAGE_SESSIONS_CAP = 60;

const SESSION_LABEL_MAX_CHARS = 32;

export interface UserMessage {
  id: string;

  text: string;

  ts: number;

  session: string;
}

const entryTimestamp = (entry: SessionEntry): number => {
  const value =
    typeof entry.timestamp === "string"
      ? Date.parse(entry.timestamp)
      : typeof entry.timestamp === "number"
        ? entry.timestamp
        : Number.NaN;
  return Number.isFinite(value) ? value : 0;
};

const bashMessageText = (msg: {
  command?: unknown;
  excludeFromContext?: unknown;
}): string => {
  const command = typeof msg.command === "string" ? msg.command.trim() : "";
  if (command.length === 0) return "";
  return `${msg.excludeFromContext === true ? "!!" : "!"}${command}`;
};

export function userMessageTextOf(entry: SessionEntry): string {
  if (entry.type !== "message") return "";
  const msg = (
    entry as {
      message?: {
        role?: unknown;
        content?: unknown;
        command?: unknown;
        excludeFromContext?: unknown;
      };
    }
  ).message;
  if (msg === undefined) return "";
  if (msg.role === "bashExecution") return bashMessageText(msg);
  if (msg.role !== "user") return "";
  return contentToText(msg.content).trim();
}

export function sessionLabelOf(info: SessionInfo): string {
  const name = (info.name ?? info.firstMessage ?? "").trim();
  if (name.length === 0) return "session";
  return truncateToWidth(singleLine(name), SESSION_LABEL_MAX_CHARS);
}

export function mergeUserMessages(
  lists: readonly (readonly UserMessage[])[],
  cap = USER_MESSAGE_HISTORY_CAP,
): UserMessage[] {
  const newestPerMessage = new Map<string, UserMessage>();
  for (const list of lists)
    for (const message of list) {
      const text = message.text.trim();
      if (text.length === 0) continue;
      const seen = newestPerMessage.get(text);
      if (seen === undefined || seen.ts < message.ts)
        newestPerMessage.set(text, { ...message, text });
    }
  return [...newestPerMessage.values()]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, cap);
}

export function userMessagesFromTree(
  tree: readonly SessionTreeNode[],
  session: string,
): UserMessage[] {
  const messages: UserMessage[] = [];
  const stack = [...tree];
  while (stack.length > 0) {
    const node = stack.pop() as SessionTreeNode;
    const entry = node.entry as SessionEntry;
    const text = userMessageTextOf(entry);
    if (text.length > 0)
      messages.push({ id: entry.id, text, ts: entryTimestamp(entry), session });
    for (const child of node.children) stack.push(child);
  }
  return messages;
}

export function userMessagesFromTranscript(
  items: readonly TranscriptItem[],
  session: string,
): UserMessage[] {
  return items
    .filter((item) => item.kind === "user")
    .map((item) => ({
      id: item.id,
      text: item.kind === "user" ? item.text : "",
      ts: item.ts ?? Date.now(),
      session,
    }));
}

export async function readFolderUserMessages(
  cwd: string,
  onProgress?: (messages: UserMessage[]) => void,
): Promise<UserMessage[]> {
  const sessions = (await AgentBridge.listSessions(cwd))
    .sort(byRecentSession)
    .slice(0, USER_MESSAGE_SESSIONS_CAP);
  const collected: UserMessage[][] = [];
  for (let index = 0; index < sessions.length; index++) {
    const info = sessions[index] as SessionInfo;
    try {
      collected.push(
        userMessagesFromTree(
          AgentBridge.readSessionTree(info.path, cwd),
          sessionLabelOf(info),
        ),
      );
    } catch {
      continue;
    }
    if (index % 4 === 3) {
      onProgress?.(mergeUserMessages(collected));
      await Promise.resolve();
    }
  }
  return mergeUserMessages(collected);
}

const historyCache = new Map<string, UserMessage[]>();

export function invalidateUserMessageHistory(cwd: string): void {
  historyCache.delete(cwd);
}

export interface UserMessageHistory {
  messages: UserMessage[];

  loading: boolean;
  error: string | null;

  reload: () => void;
}

const NO_MESSAGES: UserMessage[] = [];

export function useUserMessageHistory(
  cwd: string,
  active: boolean,
): UserMessageHistory {
  const { data, loading, error, invalidate } = useCachedResource<UserMessage[]>(
    {
      cache: historyCache,
      key: cwd,
      active,
      fallback: NO_MESSAGES,
      load: (report) => readFolderUserMessages(cwd, report),
    },
  );

  return { messages: data, loading, error, reload: invalidate };
}

export function filterUserMessages(
  messages: readonly UserMessage[],
  query: string,
): UserMessage[] {
  const out: UserMessage[] = [];
  const seen = new Set<string>();
  for (const message of messages) {
    if (seen.has(message.text)) continue;
    if (!matchesQuery(query, message.text, message.session)) continue;
    seen.add(message.text);
    out.push(message);
  }
  return out;
}

export function userMessageHistoryRows(
  messages: readonly UserMessage[],
  query: string,
): ComposerPanelRow[] {
  return filterUserMessages(messages, query).map((message) => ({
    kind: "option" as const,
    key: message.text,
    label: firstLine(message.text),
  }));
}

export function userMessageHistoryStatusText(
  total: number,
  query: string,
  visible: number,
): string {
  return cappedPanelStatusText(
    "userMessageHistory",
    total,
    visible,
    query,
    USER_MESSAGE_HISTORY_CAP,
    "in this folder’s sessions",
  );
}
