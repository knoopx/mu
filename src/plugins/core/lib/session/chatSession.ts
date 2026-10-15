import type {
  AgentSessionEvent,
  PromptOptions,
  PromptTemplate,
  SessionTreeNode,
} from "@earendil-works/pi-coding-agent";
import {
  AgentBridge,
  createAgentSessionHandle,
  type AgentSessionHandle,
  type AgentSnapshot,
  type ThinkingLevel,
} from "../agent/agentService";
import {
  transcriptItemsFromMessages,
  type TranscriptItem,
} from "../agent/transcriptState";
import type { PromptImages } from "../../components/composer/attachments";
import type { ComposerPanelRow } from "../../components/composer/Composer";
import { modelRows, thinkingRows } from "../composer/options";

export interface ChatSessionMeta {
  model: string;
  thinking: string;
  contextUsed: number;
  contextTotal: number;
}

export interface TreeSnapshot {
  tree: SessionTreeNode[];
  leafId: string | null;
}

export interface TreeNavigation {
  cancelled: boolean;
  editorText?: string;
}

export interface ChatSession {
  subscribe(onEvent: (event: AgentSessionEvent) => void): () => void;

  transcript(): TranscriptItem[];

  meta(): ChatSessionMeta;
  snapshot(): AgentSnapshot | null;

  sessionName(): string | undefined;
  sessionFile(): string | undefined;
  sessionStartTs(path: string): number | undefined;
  promptTemplates(): readonly PromptTemplate[];

  modelRows(filter: string): ComposerPanelRow[];
  thinkingRows(filter: string): ComposerPanelRow[];
  modelCount(): number;
  thinkingCount(): number;

  streaming(): boolean;
  treeSnapshot(): TreeSnapshot;

  send(
    text: string,
    images?: PromptImages,
    behavior?: PromptOptions["streamingBehavior"],
  ): Promise<void>;
  interrupt(): Promise<void>;
  newSession(): Promise<string | undefined>;
  resume(path: string): Promise<void>;
  compact(): Promise<unknown>;
  setModel(ref: string): Promise<void>;
  setThinking(level: ThinkingLevel): void;
  navigateTree(targetId: string): Promise<TreeNavigation>;

  dispose(): Promise<void>;
}

export function splitModelRef(ref: string): {
  provider: string;
  modelId: string;
} {
  const slash = ref.indexOf("/");
  return slash >= 0
    ? { provider: ref.slice(0, slash), modelId: ref.slice(slash + 1) }
    : { provider: ref, modelId: ref };
}

function metaOf(bridge: AgentBridge): ChatSessionMeta {
  const snapshot = bridge.snapshot();
  return {
    model: snapshot.model,
    thinking: snapshot.thinking,
    contextUsed: snapshot.contextUsed ?? 0,
    contextTotal: snapshot.contextTotal,
  };
}

export function chatSessionFromBridge(
  bridge: AgentBridge,
  onDispose?: () => Promise<void>,
): ChatSession {
  return {
    subscribe: (onEvent) => bridge.subscribe((event) => onEvent(event)),
    transcript: () =>
      transcriptItemsFromMessages(bridge.state.messages as never[]),
    meta: () => metaOf(bridge),
    snapshot: (): AgentSnapshot => bridge.snapshot(),
    sessionName: () => bridge.session.sessionName,
    sessionFile: () => bridge.sessionFile,
    sessionStartTs: (path) => AgentBridge.readSessionStartTs(path),
    promptTemplates: () => bridge.session.promptTemplates,
    modelRows: (filter) => modelRows(bridge, filter),
    thinkingRows: (filter) => thinkingRows(bridge, filter),
    modelCount: () => bridge.availableModels.length,
    thinkingCount: () => bridge.thinkingLevels.length,
    streaming: () => bridge.isStreaming,
    treeSnapshot: () => ({
      tree: bridge.session.sessionManager.getTree(),
      leafId: bridge.session.sessionManager.getLeafId(),
    }),
    send: (text, images, behavior) => bridge.send(text, images, behavior),
    interrupt: () => bridge.interrupt(),
    newSession: () => bridge.newSession(),
    resume: (path) => bridge.resumeSession(path),
    compact: () => bridge.compact(),
    setModel: async (ref) => {
      const { provider, modelId } = splitModelRef(ref);
      await bridge.setModel(provider, modelId);
    },
    setThinking: (level) => bridge.setThinkingLevel(level),
    navigateTree: async (targetId) => {
      const result = await bridge.navigateTree(targetId);
      return { cancelled: result.cancelled, editorText: result.editorText };
    },
    dispose: () => (onDispose ? onDispose() : Promise.resolve()),
  };
}

export async function openChatSession(cwd: string): Promise<ChatSession> {
  const handle: AgentSessionHandle = await createAgentSessionHandle({ cwd });
  return chatSessionFromBridge(handle.bridge, () => handle.dispose());
}
