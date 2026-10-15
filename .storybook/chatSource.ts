import type {
  PromptTemplate,
  SessionTreeNode,
} from "@earendil-works/pi-coding-agent";
import type {
  ChatSession,
  ChatSessionMeta,
  TreeNavigation,
  TreeSnapshot,
} from "../src/plugins/core/lib/session/chatSession";
import type {
  SessionList,
  SessionListRow,
  SessionPreviewData,
} from "../src/plugins/core/lib/session/sessionList";
import type {
  AgentSnapshot,
  SessionDeleteResult,
  SessionInfo,
  ThinkingLevel,
} from "../src/plugins/core/lib/agent/agentService";
import type { TranscriptItem } from "../src/plugins/core/lib/agent/transcriptState";
import type { ComposerPanelRow } from "../src/plugins/core/components/composer/Composer";
import type { PromptImages } from "../src/plugins/core/components/composer/attachments";

export interface StubSessionOptions {
  items?: TranscriptItem[];
  streaming?: boolean;
  meta?: ChatSessionMeta;
  snapshot?: Partial<AgentSnapshot>;
  sessionName?: string;
  sessionFile?: string;
  modelRows?: ComposerPanelRow[];
  thinkingRows?: ComposerPanelRow[];
  promptTemplates?: readonly PromptTemplate[];
  tree?: { tree: SessionTreeNode[]; leafId: string | null };
  startTs?: number;
}

const META: ChatSessionMeta = {
  model: "openrouter/anthropic/claude-sonnet-4.5",
  thinking: "xhigh",
  contextUsed: 62_700,
  contextTotal: 200_000,
};

const EMPTY_SNAPSHOT: AgentSnapshot = {
  model: META.model,
  thinking: META.thinking as ThinkingLevel,
  tokensIn: 128_400,
  tokensOut: 9_600,
  cost: 1.42,
  contextUsed: META.contextUsed,
  contextTotal: META.contextTotal,
  contextPercent: 31,
};

export function stubChatSession(options: StubSessionOptions = {}): {
  session: ChatSession;
  sent: string[];
} {
  const meta = options.meta ?? META;
  const snapshot: AgentSnapshot = {
    ...EMPTY_SNAPSHOT,
    model: meta.model,
    thinking: meta.thinking as AgentSnapshot["thinking"],
    contextUsed: meta.contextUsed,
    contextTotal: meta.contextTotal,
    contextPercent:
      meta.contextTotal > 0
        ? Math.round((meta.contextUsed / meta.contextTotal) * 100)
        : null,
    ...options.snapshot,
  };
  const sent: string[] = [];
  const transcript = options.items ?? [];
  const tree: TreeSnapshot = options.tree ?? { tree: [], leafId: null };

  return {
    sent,
    session: {
      subscribe: () => () => {},
      transcript: () => transcript,
      meta: () => meta,
      snapshot: () => snapshot,
      sessionName: () => options.sessionName ?? "story session",
      sessionFile: () => options.sessionFile,
      sessionStartTs: () => options.startTs,
      promptTemplates: () => options.promptTemplates ?? [],
      modelRows: (filter) => {
        const rows = options.modelRows ?? [];
        if (filter.length === 0) return rows;
        const needle = filter.toLowerCase();
        return rows.filter((row) => {
          const text =
            row.kind === "command" ? row.name : "label" in row ? row.label : "";
          return text.toLowerCase().includes(needle);
        });
      },
      thinkingRows: () => options.thinkingRows ?? [],
      modelCount: () => (options.modelRows ?? []).length,
      thinkingCount: () => (options.thinkingRows ?? []).length,
      streaming: () => options.streaming === true,
      treeSnapshot: () => tree,
      send: async (text: string, images?: PromptImages) => {
        sent.push(text);
        void images;
      },
      interrupt: async () => {},
      newSession: async () => undefined,
      resume: async () => {},
      compact: async () => undefined,
      setModel: async () => {},
      setThinking: () => {},
      navigateTree: async (): Promise<TreeNavigation> => ({
        cancelled: false,
        editorText: undefined,
      }),
      dispose: async () => {},
    },
  };
}

export interface StubSessionListOptions {
  rows?: SessionListRow[];

  previews?: Record<string, SessionPreviewData>;
  removed?: string[];
}

export function stubSessionList(
  options: StubSessionListOptions = {},
): SessionList {
  const rows = options.rows ?? [];
  return {
    rows: async () => rows,
    preview: (row) =>
      options.previews?.[row.path] ?? {
        label: row.label,
        age: row.age,
        items: [],
        empty: true,
      },
    remove: (path): SessionDeleteResult => {
      options.removed?.push(path);
      return { ok: true, method: "trash" };
    },
  };
}

export const sessionRow = (
  path: string,
  label: string,
  age: string,
  caption?: string,
): SessionListRow => ({
  path,
  label,
  age,
  ...(caption === undefined ? {} : { caption }),
});

export type StubSessionInfo = SessionInfo;
