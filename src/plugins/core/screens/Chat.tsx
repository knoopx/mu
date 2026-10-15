import { useCallback, useMemo, useRef, type JSX } from "react";
import {
  Icon,
  Message,
  MessageAvatar,
  MessageContent,
  T,
  Toast,
  useAdwaita,
  useToasts,
  type AdwaitaTheme,
  type ToastFn,
  type ToastItem,
} from "adwaita-gpuix";
import {
  type PublicInstance,
  type StyleDesc,
  useWindowSize,
} from "@gpuix/react";
import { mutedText, paneFill, userBandFill } from "../lib/ui/theme";
import type { TranscriptItem } from "../lib/agent/transcriptState";
import type { AgentSnapshot } from "../lib/agent/agentService";
import type { ToolImage } from "../lib/agent/content";
import {
  conversationStats,
  turnStatsById,
  type TurnStats,
} from "../lib/agent/turnStats";
import { ChatTranscript } from "../components/ChatTranscript";
import { ChatComposerSlot } from "../components/ChatComposerSlot";
import { useListJump } from "../lib/ui/listJump";
import type { CancellableLoaderHandle } from "../components/CancellableLoader";
import { AssistantMessage } from "../components/AssistantMessage";
import { ToolExecution } from "../components/ToolExecution";
import { composerGap, PAGE_INSET } from "../lib/ui/transcriptLayout";
import {
  AttachmentThumbs,
  type ComposerAttachment,
} from "../components/composer/attachments";
import {
  type ComposerPanelRow,
  type ComposerPanelSpec,
  type ComposerProps,
} from "../components/composer/Composer";
import { composerPlaceholder } from "../lib/composer/options";
import {
  panelIndex,
  panelQuery,
  panelTarget,
  type ComposerMode,
} from "../lib/composer/mode";
import {
  composerPanelRows,
  composerPanelSpec,
  type ComposerPanelData,
} from "../components/composer/panels";
import { SessionStatus } from "../components/SessionStatus";
import { useAskSnapshot, useAskUiHost } from "../../interaction/hooks/useAsk";
import { askProgressLabel } from "../../interaction/lib/progress";
import { askStore } from "../../interaction/lib/store";
import type { AskResponse } from "../../interaction/types";
import { projectSummaryRows } from "../components/ProjectSummary";
import { useProjectSummary } from "../hooks/useProjectSummary";
import { pillsFromTemplates } from "../lib/project/promptTemplates";
import { useSessionTree } from "../hooks/useSessionTree";
import { ChangesOverlayHost } from "../../vcs/components/ChangesOverlayHost";
import { useChangesPanel } from "../../vcs/hooks/useChangesPanel";
import { builtinCommands } from "../lib/commands/builtins";
import { coreCommands } from "../lib/commands/coreCommands";
import type { SlashCommand } from "../../../autocomplete";
import {
  openChatSession,
  type ChatSession,
  type TreeSnapshot,
} from "../lib/session/chatSession";
import {
  liveSessionList,
  type SessionList,
  type SessionListRow,
  type SessionPreviewData,
} from "../lib/session/sessionList";
import {
  useChatSession,
  type ChatSessionEffects,
} from "../hooks/useChatSession";
import {
  useComposerState,
  type ComposerState,
} from "../hooks/useComposerState";
import { useChatComposer } from "../hooks/useChatComposer";
import { useSessionList } from "../hooks/useSessionList";
import { useUserMessages } from "../hooks/useUserMessages";
import { useWorkspaceStatus } from "../hooks/useWorkspaceStatus";
import { useFilePreview } from "../hooks/useFilePreview";
import { useNewWindow } from "../hooks/useNewWindow";
import { useWindowHandlers } from "../hooks/useWindowHandlers";
import { useTreePreview } from "../hooks/useTreePreview";
import { useThemePanel } from "../hooks/useThemePanel";

const SLASH_COMMANDS: SlashCommand[] = [...builtinCommands, ...coreCommands];

function conversationLog(
  t: AdwaitaTheme,
  source: readonly TranscriptItem[],
  perTurn: Map<string, TurnStats>,
): JSX.Element[] {
  return withRowSpacers(
    source.map((item) => (
      <TranscriptRow key={item.id} item={item} stats={perTurn.get(item.id)} />
    )),
    transcriptRowGap(t),
  );
}

function composerMetaOf(snapshot: AgentSnapshot | null) {
  if (snapshot === null || snapshot.model == null) return null;
  return {
    model: snapshot.model,
    thinking: snapshot.thinking,
    context: contextSpecOf(snapshot),
  };
}

const emptyTranscript = (
  preview: SessionPreviewData | null,
  items: readonly unknown[],
  isStreaming: boolean,
): boolean => preview === null && items.length === 0 && !isStreaming;

const previewStatsOf = (preview: SessionPreviewData | null): Map<string, TurnStats> =>
  preview === null ? new Map<string, TurnStats>() : turnStatsById(preview.items);

const treeSnapshotOf = (
  treeOpen: boolean,
  session: ChatSession | null,
): TreeSnapshot | null => (treeOpen ? (session?.treeSnapshot() ?? null) : null);

function chatEffectsOf(
  toast: ToastFn,
  composer: ComposerState,
  sessionsChanged: () => void,
): ChatSessionEffects {
  return {
    notify: (message: string) => toast(message),
    composerText: composer.setInput,
    clearAttachments: composer.clearAttachments,
    followTail: composer.setFollowTail,
    sessionsChanged,
  };
}


function sessionRowUnderCursor(
  rows: readonly SessionListRow[],
  panelRows: readonly ComposerPanelRow[],
  mode: ComposerMode,
): SessionListRow | undefined {
  const row = panelRows[panelIndex(mode, panelRows.length)];
  if (row === undefined) return undefined;
  return rows.find((item) => item.path === row.key);
}

export { PAGE_INSET };

export function transcriptRowGap(t: AdwaitaTheme): number {
  return t.space.xl;
}

export const TRANSCRIPT_ROW_STRIDE = 2;

export function isConversationPoint(item: TranscriptItem): boolean {
  return item.kind === "user" || item.kind === "assistant";
}

export function transcriptPointRows(
  items: readonly TranscriptItem[],
): number[] {
  const rows = new Set<number>();
  items.forEach((item, index) => {
    if (isConversationPoint(item)) rows.add(index * TRANSCRIPT_ROW_STRIDE);
  });
  return [...rows].sort((a, b) => a - b);
}

export function withRowSpacers(
  nodes: JSX.Element[],
  gapPx: number,
): JSX.Element[] {
  const out: JSX.Element[] = [];
  nodes.forEach((node, i) => {
    if (i > 0)
      out.push(
        <div
          key={`gap-${i}`}
          style={{ height: gapPx, width: "100%", flexShrink: 0 }}
        />,
      );
    out.push(node);
  });
  return out;
}

export function TranscriptRow({
  item,
  stats,
}: {
  item: TranscriptItem;
  stats?: TurnStats;
}): JSX.Element {
  const body =
    item.kind === "user" ? (
      <UserRow text={item.text} images={item.images} />
    ) : item.kind === "assistant" ? (
      <AssistantMessage item={item} stats={stats} />
    ) : item.kind === "tool" ? (
      <ToolExecution item={item} />
    ) : (
      <SystemRow text={item.text} />
    );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        flexShrink: 0,
      }}
    >
      {body}
    </div>
  );
}

export function userCardStyle(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    gap: t.space.xs,
    flexGrow: 0,
    flexShrink: 1,
    alignSelf: "flex-start",
    minWidth: 0,
    maxWidth: "100%",
    padding: t.space.md,
    borderRadius: t.radius.sm,
    borderWidth: 0,
    backgroundColor: userBandFill(t),
  };
}

export function UserRow({
  text,
  images,
}: {
  text: string;

  images?: ToolImage[];
}): JSX.Element {
  const t = useAdwaita();

  const body = (
    <>
      <T size="body" weight={600} color={t.color.text.primary}>
        {text}
      </T>
      {images !== undefined && images.length > 0 ? (
        <AttachmentThumbs images={images} />
      ) : null}
    </>
  );

  return (
    <Message style={{ paddingLeft: PAGE_INSET, paddingRight: PAGE_INSET }}>
      <MessageContent style={userCardStyle(t)}>{body}</MessageContent>
    </Message>
  );
}

export function SystemRow({ text }: { text: string }): JSX.Element {
  const t = useAdwaita();
  return (
    <Message style={{ paddingLeft: PAGE_INSET, paddingRight: PAGE_INSET }}>
      <MessageAvatar>
        <Icon name="info" size={14} color={mutedText(t)} />
      </MessageAvatar>
      <MessageContent>
        <T size="caption" color={t.color.text.primary}>
          {text}
        </T>
      </MessageContent>
    </Message>
  );
}

export function contextSpecOf(
  snapshot: AgentSnapshot,
): { used: number; total: number } | null {
  if (snapshot.contextTotal <= 0) return null;
  return {
    used: snapshot.contextUsed ?? 0,
    total: snapshot.contextTotal,
  };
}

export interface ChatAppProps {
  cwd?: string;

  openSession?: () => Promise<ChatSession>;

  sessionList?: SessionList;

  initialMode?: ComposerMode;

  initialInput?: string;

  initialAttachments?: ComposerAttachment[];
}

const chatLayer: StyleDesc = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
  flexGrow: 1,
  flexBasis: 0,
  minHeight: 0,
};

export function ToastLayer(props: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}): JSX.Element {
  const t = useAdwaita();
  const win = useWindowSize();
  const offset = t.space.lg;
  const measured = typeof win?.width === "number" && win.width > 0;
  const maxWidth = measured ? Math.max(200, win.width - offset * 2) : undefined;
  return (
    <div
      style={{
        position: "absolute",
        top: offset,
        left: 0,
        width: measured ? win.width : undefined,
        paddingLeft: offset,
        paddingRight: offset,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: t.space.sm,
        pointerEvents: "none",
      }}
    >
      {props.toasts.map((item, i) => (
        <Toast
          key={item.id ?? i}
          message={item.message}
          type={item.type}
          actionLabel={item.actionLabel}
          onAction={item.onAction}
          onDismiss={() => props.onDismiss(item.id ?? "")}
          style={{
            pointerEvents: "auto",
            maxWidth: maxWidth ?? "100%",
            backgroundColor: t.color.surface.button,
            boxShadow: {
              offsetX: 0,
              offsetY: 8,
              blurRadius: 24,
              spreadRadius: -6,
              color: "rgba(0,0,0,0.55)",
            },
          }}
        />
      ))}
    </div>
  );
}

export function ChatApp(props: ChatAppProps): JSX.Element {
  const { toasts, toast, dismiss } = useToasts();
  return (
    <div style={chatLayer}>
      <ChatAppBody {...props} toast={toast} />
      <ToastLayer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function ChatAppBody(props: ChatAppProps & { toast: ToastFn }): JSX.Element {
  const t = useAdwaita();
  const toast = props.toast;
  const cwd = props.cwd ?? process.cwd();
  useAskUiHost();
  const ask = useAskSnapshot();

  const composer = useComposerState({
    initialInput: props.initialInput,
    initialAttachments: props.initialAttachments,
    initialMode: props.initialMode,
  });
  const { input, attachments, mode, setMode, followTail } = composer;

  const windowSize = useWindowSize();
  const target = panelTarget(mode);
  const query = panelQuery(mode);
  const changesOpen = target === "changes";
  const treeOpen = target === "tree";
  const sessionsOpen = target === "session";
  const userMessagesOpen = target === "userMessageHistory";

  const workspace = useWorkspaceStatus(cwd);

  const reloadAllRef = useRef<() => void>(() => {});
  const sessionsChanged = useCallback((): void => reloadAllRef.current(), []);

  const chat = useChatSession(
    cwd,
    props.openSession ?? (() => openChatSession(cwd)),
    chatEffectsOf(toast, composer, sessionsChanged),
  );
  const { items, isStreaming, session, sessionStart } = chat;

  const sessions = useSessionList(
    props.sessionList ?? liveSessionList,
    cwd,
    sessionsOpen,
  );
  const userMessages = useUserMessages(
    cwd,
    userMessagesOpen,
    items,
    session?.sessionName() ?? "this session",
  );
  reloadAllRef.current = (): void => {
    sessions.reload();
    userMessages.reload();
  };

  const themePanel = useThemePanel(mode);
  const previewFor = useFilePreview(cwd);

  const composerActions = useChatComposer({
    toast,
    chat,
    themePanel,
    session,
    removeSession: sessions.remove,
    composer,
  });

  const changesPanel = useChangesPanel({
    cwd,
    toast,
    enabled: changesOpen,
    onPickPath: composerActions.pickChangesPath,
  });

  const loaderRef = useRef<CancellableLoaderHandle | null>(null);
  const transcriptListRef = useRef<PublicInstance | null>(null);

  const treeSnapshot = useMemo<TreeSnapshot | null>(
    () => treeSnapshotOf(treeOpen, session),
    [treeOpen, session, items.length],
  );
  const tree = useSessionTree({
    data: treeSnapshot,
    enabled: treeOpen,
    query,
    onNavigate: chat.navigateTree,
  });
  const treePreview = useTreePreview(treeSnapshot, tree.selected);

  const newWindow = useNewWindow(
    (message: string) => toast(message),
    chat.system,
  );
  useWindowHandlers({
    newSession: composerActions.startNewSession,
    newWindow,
  });

  const onAskAnswer = (response: AskResponse): void => {
    askStore.answer(response);
  };

  const onAskCancel = (): void => {
    askStore.cancel();
    toast("Ask cancelled — the agent was told the run was cancelled");
  };

  const panelData: ComposerPanelData = {
    cwd,
    theme: t,
    mode,
    query,
    commands: SLASH_COMMANDS,
    session,
    themePanel,
    sessionRows: sessions.rows,
    sessionsLoading: sessions.loading,
    sessionsError: sessions.error,
    userMessages: userMessages.messages,
    userMessagesLoading: userMessages.loading,
    userMessagesError: userMessages.error,
    changes: changesPanel,
    tree,
    previewFor,
    windowHeight: windowSize?.height,
    onPick: composerActions.pickRow,
    onDelete: composerActions.removeSessionRow,
    onHover: composerActions.onHover,
  };

  const panelRows: ComposerPanelRow[] = composerPanelRows(panelData);

  const panel: ComposerPanelSpec | undefined = composerPanelSpec(
    panelData,
    panelRows,
  );

  const activeSessionRow: SessionListRow | undefined = sessionsOpen
    ? sessionRowUnderCursor(sessions.rows, panelRows, mode)
    : undefined;

  const preview: SessionPreviewData | null =
    treePreview ?? sessions.preview(activeSessionRow);

  const turnStats = useMemo(() => turnStatsById(items), [items]);

  const previewTurnStats = useMemo(() => previewStatsOf(preview), [preview]);

  const showProjectSummary = emptyTranscript(preview, items, isStreaming);
  const project = useProjectSummary(cwd, {
    active: showProjectSummary,
  });
  const transcriptSource: readonly TranscriptItem[] =
    preview === null ? items : preview.items;

  const sessionStats = conversationStats(
    transcriptSource,
    preview?.startTs ?? sessionStart,
  );

  const transcriptRows: JSX.Element[] = conversationLog(
    t,
    transcriptSource,
    preview === null ? turnStats : previewTurnStats,
  );

  const pointRows = transcriptPointRows(transcriptSource);

  const transcriptJump = useListJump({
    listRef: transcriptListRef,
    targets: pointRows,
    enabled:
      mode.kind === "draft" && ask.request === null && pointRows.length > 1,
    bindings: {
      prev: "transcript.prevPoint",
      next: "transcript.nextPoint",
    },
    onJump: (_target, isEnd) => composer.setFollowTail(isEnd),
  });

  const promptPills = pillsFromTemplates(session?.promptTemplates() ?? []);

  const summaryRows: JSX.Element[] = showProjectSummary
    ? projectSummaryRows({
        model: project.summary,
        error: project.error,
        onPrompt: composerActions.seedPrompt,
        onReload: project.reload,
        pills: promptPills,
      })
    : [];

  const snapshot = session?.snapshot() ?? null;

  const composerMeta = composerMetaOf(snapshot);

  const root: StyleDesc = {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 0,
  };
  const content: StyleDesc = {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minHeight: 0,
    paddingLeft: PAGE_INSET,
    paddingRight: PAGE_INSET,

    paddingTop: t.space.sm,
    paddingBottom: t.space.sm,
    gap: t.space.sm,
    backgroundColor: paneFill(t),
  };

  return (
    <div style={root}>
      <div style={content}>
        <ChatTranscript
          listRef={transcriptListRef}
          onVisibleRange={transcriptJump.onVisibleRange}
          followTop={showProjectSummary || !followTail}
          summaryRows={summaryRows}
          transcriptRows={transcriptRows}
          showLoader={isStreaming && preview === null}
          loaderRef={loaderRef}
          onAbort={chat.abort}
        />
        <ChatComposerSlot
          gap={composerGap(t)}
          ask={{
            request: ask.request,
            onAnswer: onAskAnswer,
            onCancel: onAskCancel,
          }}
          attachments={attachments}
          pasting={composerActions.pasting}
          onRemoveAttachment={composer.removeAttachment}
          composer={{
            value: input,
            onChange: composer.setInput,
            onSubmit: composerActions.onSubmit,
            mode,
            onMode: setMode,
            panel,
            isStreaming,
            onAbort: chat.abort,
            onPaste: composerActions.paste,
            onClear: composer.clearComposer,
            onHistory: composerActions.onHistory,
            placeholder: composerPlaceholder(),
            model: composerMeta?.model ?? null,
            thinking: composerMeta?.thinking ?? null,
            context: composerMeta?.context ?? null,
          }}
        />
        <SessionStatus
          projectPath={workspace.projectPath}
          bookmark={workspace.bookmark}
          stats={sessionStats}
          progress={ask.request === null ? null : askProgressLabel(ask.request)}
        />
        <ChangesOverlayHost panel={changesPanel} />
      </div>
    </div>
  );
}
