/**
 * The probe the app drives its own session through.
 *
 * mu's commands, its stories and anything that asks "what is the session doing"
 * without a component in the way all go through one probe. It reads the session
 * through the hook that owns it rather than holding one, so it stays valid
 * across a resume or a new session, and it answers a snapshot even before a
 * session has opened.
 */
import type { AgentSnapshot, ThinkingLevel } from "./agentService";
import type { ChatProbe } from "./chatProbe";
import type { TranscriptAction } from "./transcriptState";
import type { ChatSession } from "../session/chatSession";
import { promptSession } from "../session/sessionCommands";

export interface ProbeHandles {
  session(): ChatSession | null;

  dispatch(action: TranscriptAction): void;

  system(text: string): void;

  resume(path: string): void;

  live(): { streaming: boolean; items: number };
}

/** The empty answer, for a window whose session has not opened yet. */
const BLANK: AgentSnapshot = {
  model: "",
  thinking: "off" as ThinkingLevel,
  tokensIn: 0,
  tokensOut: 0,
  cost: 0,
  contextUsed: null,
  contextTotal: 0,
  contextPercent: null,
};

export function probeOf(handles: ProbeHandles): ChatProbe {
  return {
    submit(text: string): void {
      const current = handles.session();
      if (current === null) return;
      handles.dispatch({ type: "user", text, ts: Date.now() });
      promptSession(current, text, undefined, handles.system);
    },
    resume(path: string): void {
      handles.resume(path);
    },
    interrupt(): void {
      const current = handles.session();
      if (current === null) return;
      void current.interrupt().catch(() => {});
    },
    snapshot(): AgentSnapshot & { streaming: boolean; items: number } {
      return {
        ...BLANK,
        ...(handles.session()?.snapshot() ?? {}),
        ...handles.live(),
      };
    },
  };
}
