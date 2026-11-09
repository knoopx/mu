import type { ToastFn } from "adwaita-gpuix";
import {
  attachmentImages,
  type ComposerAttachment,
} from "../components/composer/attachments";
import type { ComposerPanelRow } from "../components/composer/Composer";
import {
  draftMode,
  pickMode,
  transition,
  type ComposerMode,
  type PickIntent,
} from "../lib/composer/mode";
import {
  deletePanelRow,
  openPanelRow,
  pickComposerRow,
  runChatCommand,
  submitThemeCommand,
  type ComposerActionContext,
} from "../lib/composer/panelActions";
import { draftIsBlank } from "../lib/composer/fieldRows";
import { pathTokenOf, stripTrailingTab } from "../lib/composer/pathCompletion";
import type { ToolImage } from "../lib/agent/content";
import type { SessionDeleteResult } from "../lib/agent/agentService";
import type { FileDeleteResult } from "../lib/files/deleteFile";
import type { FileOpenResult } from "../lib/files/openFile";
import type { ChatSession } from "../lib/session/chatSession";
import { useClipboardPaste } from "./useClipboardPaste";
import type { ComposerState } from "./useComposerState";
import type { ChatSessionState } from "./useChatSession";
import type { ThemePanelState } from "./useThemePanel";
import type { GuardrailsPanelApi } from "../../guardrails/types";

export interface ChatComposerOptions {
  toast: ToastFn;

  chat: ChatSessionState;

  themePanel: ThemePanelState;

  session: ChatSession | null;

  removeSession(path: string): SessionDeleteResult;

  removeFile(path: string): FileDeleteResult;

  openFile(path: string): Promise<FileOpenResult>;

  guardrails: GuardrailsPanelApi;

  composer: ComposerState;
}

export interface ChatComposerActions {
  actions: ComposerActionContext;

  onSubmit(value: string): void;

  pickRow(row: ComposerPanelRow, intent: PickIntent): void;

  pickChangesPath(path: string): void;

  /** Tab: open the path completion panel over the path the draft is typing. */
  completePath(): void;

  /**
   * The delete key: the panel under the cursor says what its row is, and the
   * row is taken off the disk.
   */
  deleteRow(row: ComposerPanelRow): void;

  /**
   * The open key: the file panel's row is handed to the user's editor, and the
   * panel stays where it was.
   */
  openRow(row: ComposerPanelRow): void;

  runCommand(name: string): void;

  startNewSession(): void;

  seedPrompt(text: string): void;

  /**
   * Sends text straight to the agent and follows the tail — what the changes
   * panel hands an instruction it asked for, without touching the composer.
   */
  sendInstruction(text: string): void;

  onHistory(): void;

  onHover(mode: ComposerMode, index: number, count: number): void;

  paste(): void;

  pasting: boolean;
}

const commandName = (text: string): string =>
  text.replace(/^\/+/, "").split(/\s+/)[0] ?? "";

export function useChatComposer(
  opts: ChatComposerOptions,
): ChatComposerActions {
  const {
    toast,
    chat,
    themePanel,
    session,
    removeSession,
    removeFile,
    openFile,
    guardrails,
    composer,
  } = opts;
  const {
    input,
    setInput,
    attachments,
    setAttachments,
    mode,
    setMode,
    setFollowTail,
    clearComposer,
    appendPath,
  } = composer;

  // A new session is a new conversation, not a new draft. Whatever is being
  // typed — the text and the attachments — stays typed so it can go to the
  // session that just opened; only the panel closes.
  const startNewSession = (): void => {
    setMode(draftMode());
    chat.newSession();
  };

  const runCommand = (name: string): void =>
    runChatCommand(name, {
      setMode,
      compact: chat.compact,
      newSession: startNewSession,
      system: chat.system,
    });

  const actions: ComposerActionContext = {
    mode,
    toast,
    setInput: (text) => setInput(text),
    appendInput: appendPath,
    setMode,
    themePanel,
    runCommand,
    system: chat.system,
    setModel: chat.setModel,
    setThinking: chat.setThinking,
    resumeSession: chat.resume,
    toggleGuardrail: (key) => guardrails.toggle(key),
  };

  const pickChangesPath = (path: string): void => {
    appendPath(path);
    setMode(draftMode());
  };

  // Tab is inert unless the draft ends with something that reads like a path,
  // so completing in prose does nothing at all — the way a shell behaves.
  const completePath = (): void => {
    const draft = stripTrailingTab(input);
    if (draft !== input) setInput(draft);
    if (pathTokenOf(draft) === null) return;
    setMode(pickMode("path", draft));
  };

  // Enter on a blank draft is inert: no turn starts, no row lands in the log,
  // and the draft keeps its characters. The one thing that makes a wordless
  // draft a message is an attached image — a pasted picture is asked about on
  // its own, with no words to ask it with.
  const onSubmit = (value: string): void => {
    if (draftIsBlank(value) && attachments.length === 0) return;

    const text = value.trim();
    const images = attachmentImages(attachments);
    const userImages: ToolImage[] = attachments.map((attachment) => ({
      src: attachment.src,
      mimeType: attachment.mimeType,
      bytes: attachment.bytes,
    }));
    clearComposer();
    setMode(draftMode());
    setFollowTail(true);

    if (submitThemeCommand(text, actions)) return;
    if (mode.kind === "commands") {
      runCommand(commandName(text));
      return;
    }
    chat.send(text, images, userImages);
  };

  const pickRow = (row: ComposerPanelRow, intent: PickIntent): void =>
    pickComposerRow(row, actions, intent);

  const deleteRow = (row: ComposerPanelRow): void =>
    deletePanelRow(row, {
      toast,
      mode,
      openSessionFile: () => session?.sessionFile(),
      removeSession,
      removeFile,
    });

  const openRow = (row: ComposerPanelRow): void =>
    openPanelRow(row, { toast, mode, openFile });

  const seedPrompt = (text: string): void => {
    setInput(text);
    setMode(draftMode());
    toast("Prompt added to the composer");
  };

  const sendInstruction = (text: string): void => {
    if (text.trim().length === 0) return;
    setFollowTail(true);
    chat.send(text);
  };

  const onHistory = (): void => setMode(pickMode("tree"));

  const onHover = (hover: ComposerMode, index: number, count: number): void =>
    setMode(transition(hover, { type: "hover", index, count }));

  const { paste, pasting } = useClipboardPaste({
    attach: (attachment: ComposerAttachment) =>
      setAttachments((prev) => [...prev, attachment]),
    appendText: (text: string) =>
      setInput((prev) =>
        prev.length === 0
          ? text
          : `${prev}${/\s$/.test(prev) ? "" : " "}${text}`,
      ),
    notify: (message: string, type?: "warning") =>
      toast(message, type === "warning" ? { type: "warning" } : undefined),
    system: chat.system,
  });

  return {
    actions,
    onSubmit,
    pickRow,
    pickChangesPath,
    completePath,
    deleteRow,
    openRow,
    runCommand,
    startNewSession,
    seedPrompt,
    sendInstruction,
    onHistory,
    onHover,
    paste,
    pasting,
  };
}
