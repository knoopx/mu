/**
 * The panels the composer opens.
 *
 * Every panel the composer can drop under the draft reads its own list — the
 * sessions on disk, the messages this project has sent, the theme, the guardrails,
 * the change stack, the operation log, the conversation tree — and each is only
 * read while its panel is the one that is open. The actions the panels answer with are wired here too,
 * because they are the actions of one panel on another: pick a session row and
 * the log previews it, tick a change and the composer asks for it.
 */
import { useMemo } from "react";
import type { ToastFn } from "adwaita-gpuix";
import { useWindowSize } from "@gpuix/react";
import {
  panelQuery,
  panelTarget,
  type ComposerTarget,
} from "../lib/composer/mode";
import {
  pillsFromTemplates,
  type PromptPill,
} from "../lib/project/promptTemplates";
import { liveSessionList, type SessionList } from "../lib/session/sessionList";
import type { ChatSessionState } from "./useChatSession";
import type { ComposerState } from "./useComposerState";
import { useChatComposer, type ChatComposerActions } from "./useChatComposer";
import {
  useChangesPanel,
  type ChangesPanelState,
} from "../../vcs/hooks/useChangesPanel";
import {
  useOplogPanel,
  type OplogPanelState,
} from "../../vcs/hooks/useOplogPanel";
import { useGuardrailsPanel } from "../../guardrails/hooks/useGuardrails";
import type { GuardrailsPanelApi } from "../../guardrails/types";
import { useFilePreview } from "./useFilePreview";
import { useSessionList, type SessionListState } from "./useSessionList";
import { useThemePanel, type ThemePanelState } from "./useThemePanel";
import { useUserMessages, type UserMessagesState } from "./useUserMessages";
import { useWorkspaceStatus } from "./useWorkspaceStatus";
import type { WorkspaceStatus } from "../lib/workspace/workspaceStatus";
import { useSessionTree, type SessionTreeApi } from "./useSessionTree";
import { useTreePreview } from "./useTreePreview";
import type { ComposerPreviewSpec } from "../components/composer/Composer";
import type { SessionPreviewData } from "../lib/session/sessionList";
import type { ChatSession, TreeSnapshot } from "../lib/session/chatSession";

export interface ChatPanelsOptions {
  cwd: string;
  toast: ToastFn;

  chat: ChatSessionState;
  composer: ComposerState;

  sessionList?: SessionList;

  /** the panels answer it; the session calls it when a session leaves them stale */
  noteReloadAll(reload: () => void): void;
}

export interface ChatPanels {
  target: ComposerTarget | null;
  query: string;
  workspace: WorkspaceStatus;
  windowHeight: number | undefined;

  sessions: SessionListState;
  userMessages: UserMessagesState;
  themePanel: ThemePanelState;
  guardrails: GuardrailsPanelApi;
  changesPanel: ChangesPanelState;
  oplogPanel: OplogPanelState;
  composerActions: ChatComposerActions;
  previewFor(path: string): ComposerPreviewSpec;

  treeSnapshot: TreeSnapshot | null;
  tree: SessionTreeApi;
  treePreview: SessionPreviewData | null;

  promptPills: PromptPill[];
}

/** The name the user-message panel says the messages came from. */
const sessionNameOf = (session: ChatSession | null): string =>
  session?.sessionName() ?? "this session";

/** The prompt templates the project header offers as pills. */
const promptTemplatesOf = (session: ChatSession | null) =>
  session?.promptTemplates() ?? [];

const treeSnapshotOf = (
  treeOpen: boolean,
  session: ChatSession | null,
): TreeSnapshot | null => (treeOpen ? (session?.treeSnapshot() ?? null) : null);

export function useChatPanels(options: ChatPanelsOptions): ChatPanels {
  const { cwd, toast, chat, composer, sessionList, noteReloadAll } = options;
  const { items, session, navigateTree } = chat;
  const { mode } = composer;

  const windowSize = useWindowSize();
  const workspace = useWorkspaceStatus(cwd);
  const target = panelTarget(mode);
  const query = panelQuery(mode);

  const sessions = useSessionList(
    sessionList ?? liveSessionList,
    cwd,
    target === "session",
  );
  const userMessages = useUserMessages(
    cwd,
    target === "userMessageHistory",
    items,
    sessionNameOf(session),
  );
  noteReloadAll((): void => {
    sessions.reload();
    userMessages.reload();
  });

  const themePanel = useThemePanel(mode);
  const previewFor = useFilePreview(cwd);
  const guardrails = useGuardrailsPanel(query, target === "guardrails");

  const composerActions = useChatComposer({
    toast,
    chat,
    themePanel,
    session,
    removeSession: sessions.remove,
    guardrails,
    composer,
  });

  const changesPanel = useChangesPanel({
    cwd,
    toast,
    enabled: target === "changes",
    onPickPath: composerActions.pickChangesPath,
    onInstruction: composerActions.sendInstruction,
  });

  const oplogPanel = useOplogPanel({
    cwd,
    toast,
    enabled: target === "oplog",
  });

  const treeSnapshot = useMemo(
    () => treeSnapshotOf(target === "tree", session),
    [target, session, items.length],
  );
  const tree = useSessionTree({
    data: treeSnapshot,
    enabled: target === "tree",
    query,
    onNavigate: navigateTree,
  });
  const treePreview = useTreePreview(treeSnapshot, tree.selected);

  return {
    target,
    query,
    workspace,
    windowHeight: windowSize?.height,
    sessions,
    userMessages,
    themePanel,
    guardrails,
    changesPanel,
    oplogPanel,
    composerActions,
    previewFor,
    treeSnapshot,
    tree,
    treePreview,
    promptPills: pillsFromTemplates(promptTemplatesOf(session)),
  };
}
