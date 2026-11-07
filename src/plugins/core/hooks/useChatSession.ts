/**
 * The session the window is reading.
 *
 * One session is open at a time and it is opened once, for the life of the
 * window: its events are mapped onto transcript actions, its probe is wired to
 * the app, and its teardown is the cleanup of the effect that opened it. The
 * commands that ask it for something live in useChatSessionCommands; this hook
 * owns the session and the state around it.
 */
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
import { probeOf } from "../lib/agent/sessionProbe";
import { errMsg } from "../lib/utils/errMsg";
import type {
  ChatSessionEffects,
  TreeTarget,
} from "../lib/session/sessionCommands";
import { useChatSessionCommands } from "./useChatSessionCommands";

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
  const effectsRef = useRef(effects);
  effectsRef.current = effects;
  const itemsRef = useRef(items.length);
  itemsRef.current = items.length;
  const streamingRef = useRef(isStreaming);
  streamingRef.current = isStreaming;

  const system = useCallback(
    (text: string): void => {
      dispatch({ type: "system", text });
    },
    [dispatch],
  );

  const restore = useCallback((): void => {
    const current = sessionRef.current;
    if (current === null) return;
    dispatch({ type: "restore", items: current.transcript() });
    dispatch({ type: "settled", aborted: false });
  }, [dispatch]);

  const commands = useChatSessionCommands({
    session: () => sessionRef.current,
    system,
    restore,
    clearLog: () => {
      dispatch({ type: "clear" });
      dispatch({ type: "settled", aborted: false });
    },
    effects: () => effectsRef.current,
    recordPrompt: (text, images) =>
      dispatch({
        type: "user",
        text,
        ts: Date.now(),
        ...(images === undefined || images.length === 0 ? {} : { images }),
      }),
    sessionStartedAt: setSessionStart,
  });

  /** The probe is wired once, so it reads the commands through a reference. */
  const commandsRef = useRef(commands);
  commandsRef.current = commands;

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const mapCtx: MapEventContext = {};
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
          for (const action of mapEvent(event, mapCtx)) dispatch(action);
        });
        setChatProbe(
          probeOf({
            session: () => sessionRef.current,
            dispatch,
            system,
            resume: (path) => {
              void commandsRef.current.resume(path);
            },
            live: () => ({
              streaming: streamingRef.current,
              items: itemsRef.current,
            }),
          }),
        );
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

  return {
    items,
    isStreaming: isStreaming || sessionStreaming,
    ready,
    session,
    sessionStart,
    dispatch,
    system,
    ...commands,
  };
}
