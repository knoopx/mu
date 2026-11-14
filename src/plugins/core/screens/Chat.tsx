import { Fragment, memo, useEffect, useMemo, useRef, type JSX } from "react";
import {
  Message,
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
import {
  elevatedShadow,
  mutedText,
  paneFill,
  userBandFill,
} from "../lib/ui/theme";
import { proseMeasure } from "../lib/ui/tokens";
import { ToolStateLine } from "../components/ToolStateLine";
import type { TranscriptItem } from "../lib/agent/transcriptState";
import type { AgentSnapshot } from "../lib/agent/agentService";
import type { ToolImage } from "../lib/agent/content";
import { type TurnStats } from "../lib/agent/turnStats";
import { ChatTranscript } from "../components/ChatTranscript";
import { ImageViewer } from "../components/ImageViewer";
import { ChatComposerSlot } from "../components/ChatComposerSlot";
import { AssistantMessage } from "../components/AssistantMessage";
import { ToolExecution } from "../components/ToolExecution";
import { HOST } from "../../registry";
import {
  commandSurfaces,
  dedicatedRowOf,
  panelOverlays,
} from "../lib/plugin/surfaces";
import {
  composerGap,
  PAGE_INSET,
  userMessageLineHeight,
} from "../lib/ui/transcriptLayout";
import {
  AttachmentThumbs,
  type ComposerAttachment,
} from "../components/composer/attachments";
import {
  type ComposerPanelRow,
  type ComposerPanelSpec,
} from "../components/composer/Composer";
import { composerPlaceholder } from "../lib/composer/options";
import {
  panelIndex,
  panelTarget,
  type ComposerMode,
} from "../lib/composer/mode";
import {
  composerPanelRows,
  composerPanelSpec,
} from "../components/composer/panels";
import type { ComposerPanelData } from "../lib/composer/panelData";
import { SessionStatus } from "../components/SessionStatus";
import { useAskSnapshot, useAskUiHost } from "../../interaction/hooks/useAsk";
import { askProgressLabel } from "../../interaction/lib/progress";
import { askStore } from "../../interaction/lib/store";
import type { AskResponse, AskRequest } from "../../interaction/types";
import { projectSummaryRows } from "../components/ProjectSummary";
import {
  useProjectSummary,
  type ProjectSummaryState,
} from "../hooks/useProjectSummary";
import type { PromptPill } from "../lib/project/promptTemplates";
import type { SlashCommand } from "../../../autocomplete";
import { openChatSession, type ChatSession } from "../lib/session/chatSession";
import {
  type SessionList,
  type SessionListRow,
  type SessionPreviewData,
} from "../lib/session/sessionList";
import type { SessionListState } from "../hooks/useSessionList";
import { useChatSession } from "../hooks/useChatSession";
import { useRunningClock } from "../hooks/useRunningClock";
import type { ChatSessionEffects } from "../lib/session/sessionCommands";
import {
  useComposerState,
  type ComposerState,
} from "../hooks/useComposerState";
import { useNewWindow } from "../hooks/useNewWindow";
import { useWindowHandlers } from "../hooks/useWindowHandlers";
import { useTranscriptView } from "../hooks/useTranscriptView";
import { useChatPanels, type ChatPanels } from "../hooks/useChatPanels";
import { useReloadAll } from "../hooks/useReloadAll";
import { pruneFences } from "../../openui/lib/fences/store";
import { supersededOf } from "../../openui/lib/fences/supersession";
import { useAnswerSheet } from "../../openui/hooks/useAnswerSheet";
import { answerSheet } from "../../openui/lib/answer/store";

const slashCommands = (): SlashCommand[] => commandSurfaces(HOST);

function conversationLog(
  t: AdwaitaTheme,
  source: readonly TranscriptItem[],
  perTurn: Map<string, TurnStats>,
): JSX.Element[] {
  // A `ui` block belongs to the reply it stands in, and a reply is named by its
  // place among the conversation's replies; a reply with a user message after it
  // has been answered, and its block's questions have closed with that message.
  const answered = supersededOf(source);
  let replies = -1;
  return withRowSpacers(
    source.map((item, index) => (
      <TranscriptRow
        key={item.id}
        item={item}
        stats={perTurn.get(item.id)}
        uiMessage={item.kind === "assistant" ? (replies += 1) : -1}
        answered={answered[index] === true}
      />
    )),
    transcriptRowGap(t),
  );
}

interface ComposerMeta {
  model: string | null;
  thinking: AgentSnapshot["thinking"] | null;
  context: { used: number; total: number } | null;
}

const NO_META: ComposerMeta = { model: null, thinking: null, context: null };

function composerMetaOf(snapshot: AgentSnapshot | null): ComposerMeta {
  if (snapshot === null || snapshot.model == null) return NO_META;
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

const cwdOf = (props: ChatAppProps): string => props.cwd ?? process.cwd();

const openSessionOf = (
  props: ChatAppProps,
  cwd: string,
): (() => Promise<ChatSession>) =>
  props.openSession ?? (() => openChatSession(cwd));

const snapshotOf = (session: ChatSession | null): AgentSnapshot | null =>
  session?.snapshot() ?? null;

const progressOf = (request: AskRequest | null): string | null =>
  request === null ? null : askProgressLabel(request);

const followTopOf = (
  showProjectSummary: boolean,
  followTail: boolean,
): boolean => showProjectSummary || !followTail;

const previewOf = (
  treePreview: SessionPreviewData | null,
  sessions: SessionListState,
  activeSessionRow: SessionListRow | undefined,
): SessionPreviewData | null =>
  treePreview ?? sessions.preview(activeSessionRow);

function summaryRowsOf(
  open: boolean,
  project: ProjectSummaryState,
  onPrompt: (text: string) => void,
  pills: PromptPill[],
): JSX.Element[] {
  if (!open) return [];
  return projectSummaryRows({
    model: project.summary,
    error: project.error,
    onPrompt,
    onReload: project.reload,
    pills,
  });
}

function panelDataOf(
  panels: ChatPanels,
  theme: AdwaitaTheme,
  cwd: string,
  mode: ComposerMode,
  session: ChatSession | null,
): ComposerPanelData {
  const { sessions, userMessages, composerActions } = panels;
  return {
    cwd,
    theme,
    mode,
    query: panels.query,
    commands: slashCommands(),
    session,
    themePanel: panels.themePanel,
    sessionRows: sessions.rows,
    sessionsLoading: sessions.loading,
    sessionsError: sessions.error,
    userMessages: userMessages.messages,
    userMessagesLoading: userMessages.loading,
    userMessagesError: userMessages.error,
    tree: panels.tree,
    panelState: panels.panelState,
    previewFor: panels.previewFor,
    windowHeight: panels.windowHeight,
    // The panel's own state travels with the pick: what the row means is the
    // panel's business, and the state it built is what it acts on.
    onPick: (row, intent) =>
      composerActions.pickRow(row, intent, panels.panelState),
    onDelete: composerActions.deleteRow,
    onOpen: composerActions.openRow,
    onEdit: composerActions.editRow,
    onHover: composerActions.onHover,
  };
}

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

export function transcriptRowGap(t: AdwaitaTheme): number {
  return t.space.xl;
}

interface ComposerPanelView {
  rows: ComposerPanelRow[];
  panel: ComposerPanelSpec | undefined;
  activeSessionRow: SessionListRow | undefined;
}

function composerPanelViewOf(data: ComposerPanelData): ComposerPanelView {
  const rows = composerPanelRows(data);
  const underCursor =
    panelTarget(data.mode) === "session"
      ? sessionRowUnderCursor(data.sessionRows, rows, data.mode)
      : undefined;
  return {
    rows,
    panel: composerPanelSpec(data, rows),
    activeSessionRow: underCursor,
  };
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

export const TranscriptRow = memo(function TranscriptRow({
  item,
  stats,
  uiMessage,
  answered,
}: {
  item: TranscriptItem;
  stats?: TurnStats;
  uiMessage?: number;
  answered?: boolean;
}): JSX.Element {
  const body =
    item.kind === "user" ? (
      <UserRow text={item.text} images={item.images} />
    ) : item.kind === "assistant" ? (
      <AssistantMessage
        item={item}
        stats={stats}
        uiMessage={uiMessage}
        answered={answered}
      />
    ) : item.kind === "tool" ? (
      (dedicatedRowOf(HOST, item) ?? <ToolExecution item={item} />)
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
});

function userCardStyle(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    gap: t.space.xs,
    flexGrow: 0,
    flexShrink: 1,
    alignSelf: "flex-start",
    minWidth: 0,
    // A long message is prose too, so it stops at the same measure the replies
    // do rather than running the width of a wide window.
    maxWidth: proseMeasure(t),
    padding: t.space.md,
    borderRadius: t.radius.sm,
    borderWidth: 0,
    backgroundColor: userBandFill(t),
  };
}

function UserRow({
  text,
  images,
}: {
  text: string;

  images?: ToolImage[];
}): JSX.Element {
  const t = useAdwaita();

  const body = (
    <>
      <T
        size="body"
        color={t.color.text.primary}
        style={{ lineHeight: userMessageLineHeight(t) }}
      >
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

const insetRow: StyleDesc = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  minWidth: 0,
  flexShrink: 0,
  paddingLeft: PAGE_INSET,
  paddingRight: PAGE_INSET,
};

function SystemRow({ text }: { text: string }): JSX.Element {
  const t = useAdwaita();
  return (
    <div style={insetRow}>
      <ToolStateLine icon="info" text={text} color={mutedText(t)} />
    </div>
  );
}

function contextSpecOf(
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

  /** whether the log stands at the end of the transcript (the live default) or at its top */
  followTail?: boolean;

  now?: number;
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

function ToastLayer(props: {
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

            ...(item.type && item.type !== "default"
              ? {}
              : { backgroundColor: t.color.surface.button }),
            boxShadow: elevatedShadow(),
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
      {/* A picture the log was clicked over covers the whole window; the toast
          layer stays above it so a message is still read while one is up. */}
      <ImageViewer />
      <ToastLayer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function ChatAppBody(props: ChatAppProps & { toast: ToastFn }): JSX.Element {
  const t = useAdwaita();
  const toast = props.toast;
  const cwd = cwdOf(props);
  useAskUiHost();
  const ask = useAskSnapshot();

  const composer = useComposerState({
    initialInput: props.initialInput,
    initialAttachments: props.initialAttachments,
    initialMode: props.initialMode,
    initialFollowTail: props.followTail,
  });
  const { input, attachments, mode, setMode, followTail } = composer;

  // The answer sheet lives in the draft: what the human answers in a screen goes
  // into the message they are already typing, and nothing of it is sent until
  // they send.
  useAnswerSheet(composer);

  const reloadAll = useReloadAll();
  const chat = useChatSession(
    cwd,
    openSessionOf(props, cwd),
    chatEffectsOf(toast, composer, reloadAll.changed),
  );
  const { items, isStreaming, session, sessionStart } = chat;

  // A different conversation takes its staged answers and its sent record with it.
  const sessionFile = session?.sessionFile() ?? "";
  useEffect(() => {
    answerSheet.clear();
  }, [sessionFile]);

  // A `ui` block is named by the reply it stands in, so a rewind that drops a
  // reply drops its block: nothing paints it any more, and its staged answers
  // would otherwise go on answering a question no longer on screen.
  const replies = items.reduce(
    (count, item) => count + (item.kind === "assistant" ? 1 : 0),
    0,
  );
  useEffect(() => {
    if (items.length > 0) pruneFences(replies);
  }, [replies, items.length]);

  const panels = useChatPanels({
    cwd,
    toast,
    chat,
    composer,
    sessionList: props.sessionList,
    noteReloadAll: reloadAll.note,
  });
  const { workspace, sessions, composerActions, treePreview, promptPills } =
    panels;

  const transcriptListRef = useRef<PublicInstance | null>(null);

  const newWindow = useNewWindow(chat.system);
  useWindowHandlers({
    newSession: composerActions.startNewSession,
    newWindow,
  });

  const panelView = composerPanelViewOf(
    panelDataOf(panels, t, cwd, mode, session),
  );
  const preview = previewOf(treePreview, sessions, panelView.activeSessionRow);

  const showProjectSummary = emptyTranscript(preview, items, isStreaming);
  const project = useProjectSummary(cwd, {
    active: showProjectSummary,
  });

  const running = preview === null && isStreaming;
  const tick = useRunningClock(running);

  const transcript = useTranscriptView({
    items,
    preview,
    sessionStart,
    clock: { now: props.now ?? tick, running },
    mode,
    askOpen: ask.request !== null,
    listRef: transcriptListRef,
    followTail: composer.setFollowTail,
  });

  const transcriptRows: JSX.Element[] = useMemo(
    () => conversationLog(t, transcript.source, transcript.stats),
    [t, transcript.source, transcript.stats],
  );
  const summaryRows: JSX.Element[] = summaryRowsOf(
    showProjectSummary,
    project,
    composerActions.seedPrompt,
    promptPills,
  );
  const composerMeta = composerMetaOf(snapshotOf(session));

  const onAskAnswer = (response: AskResponse): void => {
    askStore.answer(response);
  };

  const onAskCancel = (): void => {
    askStore.cancel();
    toast("Ask cancelled — the agent was told the run was cancelled");
  };

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
          onVisibleRange={transcript.onVisibleRange}
          followTop={followTopOf(showProjectSummary, followTail)}
          summaryRows={summaryRows}
          transcriptRows={transcriptRows}
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
            onSubmit: (value: string) => {
              // What was staged went out with this message: its questions fold.
              answerSheet.markSent();
              composerActions.onSubmit(value);
            },
            mode,
            onMode: setMode,
            panel: panelView.panel,
            isStreaming,
            onAbort: chat.abort,
            onPaste: composerActions.paste,
            onClear: composer.clearComposer,
            onHistory: composerActions.onHistory,
            onComplete: composerActions.completePath,
            placeholder: composerPlaceholder(),
            model: composerMeta.model,
            thinking: composerMeta.thinking,
            context: composerMeta.context,
          }}
        />
        <SessionStatus
          projectPath={workspace.projectPath}
          bookmark={workspace.bookmark}
          stats={transcript.conversation}
          progress={progressOf(ask.request)}
        />
        {panelOverlays(HOST, panels.panelState).map(({ key, node }) => (
          <Fragment key={key}>{node}</Fragment>
        ))}
      </div>
    </div>
  );
}
