import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import { openChatSession, type ChatSession } from "../lib/session/chatSession";
import { mapEvent } from "../lib/agent/eventMapper";
import type { MapEventContext } from "../lib/agent/eventHandlers";
import {
  useTranscriptState,
  type TranscriptAction,
  type TranscriptItem,
} from "../lib/agent/transcriptState";
import type { ToolImage } from "../lib/agent/content";
import type { PromptImages } from "../components/composer/attachments";
import type { ThinkingLevel } from "../lib/agent/agentService";
import { setChatProbe } from "../lib/agent/chatProbe";
import { errMsg } from "../lib/utils/errMsg";

export interface TreeTarget {
  id: string;
  leaf?: boolean;
  role?: string;
}

export interface ChatSessionEffects {
  notify(message: string): void;
  composerText?(text: string): void;
  clearAttachments?(): void;
  followTail?(follow: boolean): void;
  sessionsChanged?(): void;
}

export interface ChatSessionState {
  items: TranscriptItem[];
  isStreaming: boolean;
  ready: boolean;
  session: ChatSession | null;
  sessionStart: number | undefined;
  dispatch: (action: TranscriptAction) => void;
  system(text: string): void;
  send(text: string, images?: PromptImages, userImages?: ToolImage[]): void;
  abort(): void;
  newSession(): void;
  resume(path: string, onDone?: () => void): void;
  setModel(ref: string): void;
  setThinking(level: ThinkingLevel): void;
  compact(): void;
  navigateTree(target: TreeTarget): void;
}

export function useChatSession(
  cwd: string,
  open: () => Promise<ChatSession> = () => openChatSession(cwd),
  effects: ChatSessionEffects = { notify: () => {} },
): ChatSessionState {
  const { items, isStreaming, dispatch } = useTranscriptState();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [sessionStreaming, setSessionStreaming] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionStart, setSessionStart] = useState<number | undefined>(
    undefined,
  );

  const sessionRef = useRef<ChatSession | null>(null);
  const mapCtxRef = useRef<MapEventContext>({});
  const effectsRef = useRef(effects);
  effectsRef.current = effects;
  const itemsRef = useRef(items.length);
  itemsRef.current = items.length;
  const streamingRef = useRef(isStreaming);
  streamingRef.current = isStreaming;

  const system = useCallback((text: string): void => {
    dispatch({ type: "system", text });
  }, []);

  const restore = useCallback((): void => {
    const current = sessionRef.current;
    if (current === null) return;
    dispatch({ type: "restore", items: current.transcript() });
    dispatch({ type: "settled", aborted: false });
  }, []);

  const resume = useCallback(
    async (path: string, onDone?: () => void): Promise<void> => {
      const current = sessionRef.current;
      if (current === null) {
        system("Agent not ready — try again in a moment");
        return;
      }
      try {
        await current.resume(path);
        restore();
        effectsRef.current.clearAttachments?.();
        setSessionStart(current.sessionStartTs(path) ?? Date.now());
        effectsRef.current.followTail?.(true);
        effectsRef.current.sessionsChanged?.();
        onDone?.();
      } catch (err: unknown) {
        system(`Resume error: ${errMsg(err)}`);
      }
    },
    [restore, system],
  );

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    open()
      .then((next) => {
        if (cancelled) {
          void next.dispose();
          return;
        }
        sessionRef.current = next;
        dispatch({ type: "restore", items: next.transcript() });
        setSessionStreaming(next.streaming());
        unsubscribe = next.subscribe((event: AgentSessionEvent) => {
          for (const action of mapEvent(event, mapCtxRef.current))
            dispatch(action);
        });
        setChatProbe({
          submit(text: string): void {
            const current = sessionRef.current;
            if (current === null) return;
            dispatch({ type: "user", text, ts: Date.now() });
            void current
              .send(
                text,
                undefined,
                current.streaming() ? "followUp" : undefined,
              )
              .catch((err: unknown) => system(`Prompt error: ${errMsg(err)}`));
          },
          resume(path: string): void {
            void resume(path);
          },
          interrupt(): void {
            void sessionRef.current?.interrupt().catch(() => {});
          },
          snapshot() {
            const current = sessionRef.current;
            return {
              model: "",
              thinking: "off",
              tokensIn: 0,
              tokensOut: 0,
              cost: 0,
              contextUsed: null,
              contextTotal: 0,
              contextPercent: null,
              ...(current?.snapshot() ?? {}),
              streaming: streamingRef.current,
              items: itemsRef.current,
            };
          },
        });
        setSession(next);
        setSessionStart(Date.now());
        setReady(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) system(`Agent session failed to start: ${errMsg(err)}`);
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
      setChatProbe(null);
      const current = sessionRef.current;
      sessionRef.current = null;
      setSession(null);
      setReady(false);
      if (current) void current.dispose();
    };
  }, []);

  const send = useCallback(
    (text: string, images?: PromptImages, userImages?: ToolImage[]): void => {
      dispatch({
        type: "user",
        text,
        ts: Date.now(),
        ...(userImages === undefined || userImages.length === 0
          ? {}
          : { images: userImages }),
      });
      const current = sessionRef.current;
      if (current === null) {
        system("Agent not ready — try again in a moment");
        return;
      }
      void current
        .send(text, images, current.streaming() ? "followUp" : undefined)
        .catch((err: unknown) => system(`Prompt error: ${errMsg(err)}`));
    },
    [system],
  );

  const abort = useCallback((): void => {
    void sessionRef.current?.interrupt().catch(() => {});
  }, []);

  const newSession = useCallback((): void => {
    const current = sessionRef.current;
    if (current === null) {
      system("Agent not ready — try again in a moment");
      return;
    }
    void current
      .newSession()
      .then(() => {
        dispatch({ type: "clear" });
        dispatch({ type: "settled", aborted: false });
        setSessionStart(Date.now());
        effectsRef.current.followTail?.(true);
        effectsRef.current.sessionsChanged?.();
        const model = current.snapshot()?.model ?? "";
        effectsRef.current.notify(
          model.length > 0
            ? `New session started · ${model}`
            : "New session started",
        );
      })
      .catch((err: unknown) => system(`New session error: ${errMsg(err)}`));
  }, [system]);

  const setModel = useCallback(
    (ref: string): void => {
      const current = sessionRef.current;
      if (current === null) return;
      void current
        .setModel(ref)
        .catch((err: unknown) => system(`Model error: ${errMsg(err)}`));
    },
    [system],
  );

  const setThinking = useCallback((level: ThinkingLevel): void => {
    sessionRef.current?.setThinking(level);
  }, []);

  const compact = useCallback((): void => {
    const current = sessionRef.current;
    if (current === null) return;
    void current
      .compact()
      .catch((err: unknown) => system(`Compact error: ${errMsg(err)}`));
  }, [system]);

  const navigateTree = useCallback(
    (target: TreeTarget): void => {
      const current = sessionRef.current;
      if (current === null) {
        system("Agent not ready — try again in a moment");
        return;
      }
      if (target.leaf === true) {
        effectsRef.current.notify("Already at this point in the session");
        return;
      }
      void (async () => {
        try {
          if (current.streaming()) await current.interrupt().catch(() => {});
          const result = await current.navigateTree(target.id);
          if (result.cancelled) {
            effectsRef.current.notify("Navigation cancelled");
            return;
          }
          restore();
          if (
            typeof result.editorText === "string" &&
            result.editorText.trim().length > 0
          )
            effectsRef.current.composerText?.(result.editorText);
          effectsRef.current.notify(
            target.role === "user"
              ? "Jumped back — the message is back in the composer"
              : "Jumped back to that point",
          );
        } catch (err: unknown) {
          system(`History navigation error: ${errMsg(err)}`);
        }
      })();
    },
    [restore, system],
  );

  return {
    items,
    isStreaming: isStreaming || sessionStreaming,
    ready,
    session,
    sessionStart,
    dispatch,
    system,
    send,
    abort,
    newSession,
    resume,
    setModel,
    setThinking,
    compact,
    navigateTree,
  };
}
