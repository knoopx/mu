/**
 * Asking the agent for something.
 *
 * Everything the window does to a session — a prompt, an interrupt, a new
 * session, a resume, a model change, a jump back through history — is the same
 * bargain: act on whatever session is open, and if the answer is an error, say
 * so in the log rather than throwing it. The session is the owning hook's to
 * hold; these commands only ever borrow it.
 */
import { useCallback } from "react";
import type { ChatSession } from "../lib/session/chatSession";
import type { ToolImage } from "../lib/agent/content";
import type { PromptImages } from "../components/composer/attachments";
import type { ThinkingLevel } from "../lib/agent/agentService";
import { errMsg } from "../lib/utils/errMsg";
import {
  navigateTree,
  promptSession,
  readySession,
  type ChatSessionEffects,
  type TreeTarget,
} from "../lib/session/sessionCommands";

export interface ChatSessionCommandsOptions {
  /** the session under the hook, which may not be open yet */
  session(): ChatSession | null;

  system(text: string): void;

  /** the log, for the commands that rewrite what a session has left there */
  restore(): void;
  clearLog(): void;

  /** what the app does when a command leaves it something to show */
  effects(): ChatSessionEffects;

  /** the row a prompt leaves in the log before the session sees it */
  recordPrompt(text: string, images?: ToolImage[]): void;

  sessionStartedAt(at: number): void;
}

export interface ChatSessionCommands {
  send(text: string, images?: PromptImages, userImages?: ToolImage[]): void;
  abort(): void;
  newSession(): void;
  resume(path: string, onDone?: () => void): void;
  setModel(ref: string): void;
  setThinking(level: ThinkingLevel): void;
  compact(): void;
  navigateTree(target: TreeTarget): void;
}

/** What a new session leaves the app with: an empty log and the model's name. */
function newSessionNotice(model: string): string {
  return model.length > 0
    ? `New session started · ${model}`
    : "New session started";
}

export function useChatSessionCommands(
  options: ChatSessionCommandsOptions,
): ChatSessionCommands {
  const {
    session,
    system,
    restore,
    clearLog,
    effects,
    recordPrompt,
    sessionStartedAt,
  } = options;

  const send = useCallback(
    (text: string, images?: PromptImages, userImages?: ToolImage[]): void => {
      recordPrompt(text, userImages);
      const current = readySession(session(), system);
      if (current === null) return;
      promptSession(current, text, images, system);
    },
    [recordPrompt, session, system],
  );

  const abort = useCallback((): void => {
    const current = session();
    if (current === null) return;
    void current.interrupt().catch(() => {});
  }, [session]);

  const resume = useCallback(
    async (path: string, onDone?: () => void): Promise<void> => {
      const current = readySession(session(), system);
      if (current === null) return;
      try {
        await current.resume(path);
        restore();
        effects().clearAttachments?.();
        sessionStartedAt(current.sessionStartTs(path) ?? Date.now());
        effects().followTail?.(true);
        effects().sessionsChanged?.();
        onDone?.();
      } catch (err: unknown) {
        system(`Resume error: ${errMsg(err)}`);
      }
    },
    [effects, restore, session, sessionStartedAt, system],
  );

  const newSession = useCallback((): void => {
    const current = readySession(session(), system);
    if (current === null) return;
    void current
      .newSession()
      .then(() => {
        clearLog();
        sessionStartedAt(Date.now());
        effects().followTail?.(true);
        effects().sessionsChanged?.();
        effects().notify(newSessionNotice(current.snapshot()?.model ?? ""));
      })
      .catch((err: unknown) => system(`New session error: ${errMsg(err)}`));
  }, [clearLog, effects, session, sessionStartedAt, system]);

  const setModel = useCallback(
    (ref: string): void => {
      const current = session();
      if (current === null) return;
      void current
        .setModel(ref)
        .catch((err: unknown) => system(`Model error: ${errMsg(err)}`));
    },
    [session, system],
  );

  const setThinking = useCallback(
    (level: ThinkingLevel): void => {
      session()?.setThinking(level);
    },
    [session],
  );

  const compact = useCallback((): void => {
    const current = session();
    if (current === null) return;
    void current
      .compact()
      .catch((err: unknown) => system(`Compact error: ${errMsg(err)}`));
  }, [session, system]);

  const jumpTo = useCallback(
    (target: TreeTarget): void => {
      const current = readySession(session(), system);
      if (current === null) return;
      if (target.leaf === true) {
        effects().notify("Already at this point in the session");
        return;
      }
      void navigateTree(current, target, {
        restore,
        composerText: (text) => effects().composerText?.(text),
        notify: (message) => effects().notify(message),
        system,
      });
    },
    [effects, restore, session, system],
  );

  return {
    send,
    abort,
    newSession,
    resume,
    setModel,
    setThinking,
    compact,
    navigateTree: jumpTo,
  };
}
