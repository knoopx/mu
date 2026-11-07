/**
 * The commands a chat session is driven by, and what the app is told back.
 *
 * A session answers in three ways: rows for the log, notices for the toasts,
 * and a handful of effects on the composer and the session list. This file
 * holds those contracts and the few things every command does — refuse politely
 * when no session is open, queue a prompt behind a running turn, cut a running
 * turn short before jumping through history — so the hook that owns the session
 * has only the owning of state left to do.
 */
import type { ChatSession } from "./chatSession";
import type { PromptImages } from "../../components/composer/attachments";
import { errMsg } from "../utils/errMsg";

const NOT_READY = "Agent not ready — try again in a moment";

/** What the app does when a session command leaves it something to show. */
export interface ChatSessionEffects {
  notify(message: string): void;
  composerText?(text: string): void;
  clearAttachments?(): void;
  followTail?(follow: boolean): void;
  sessionsChanged?(): void;
}

/** One node of the conversation tree the reader can jump back to. */
export interface TreeTarget {
  id: string;
  leaf?: boolean;
  role?: string;
}

/** The session a command needs, or the notice that the agent has none yet. */
export function readySession(
  current: ChatSession | null,
  system: (text: string) => void,
): ChatSession | null {
  if (current === null) system(NOT_READY);
  return current;
}

/** Hand a prompt to the session, queued behind a running turn when there is one. */
export function promptSession(
  session: ChatSession,
  text: string,
  images: PromptImages | undefined,
  system: (text: string) => void,
): void {
  void session
    .send(text, images, session.streaming() ? "followUp" : undefined)
    .catch((err: unknown) => system(`Prompt error: ${errMsg(err)}`));
}

/** What jumping the conversation back to a tree node needs from the app. */
export interface TreeHandles {
  restore(): void;
  composerText(text: string): void;
  notify(message: string): void;
  system(text: string): void;
}

/**
 * Cut a running turn short and move the conversation to a tree node. A user
 * node hands its text back to the composer, so the jump reads as editing the
 * session rather than replaying it.
 */
export async function navigateTree(
  session: ChatSession,
  target: TreeTarget,
  handles: TreeHandles,
): Promise<void> {
  try {
    if (session.streaming()) await session.interrupt().catch(() => {});
    const result = await session.navigateTree(target.id);
    if (result.cancelled) {
      handles.notify("Navigation cancelled");
      return;
    }
    handles.restore();
    if (
      typeof result.editorText === "string" &&
      result.editorText.trim().length > 0
    )
      handles.composerText(result.editorText);
    handles.notify(
      target.role === "user"
        ? "Jumped back — the message is back in the composer"
        : "Jumped back to that point",
    );
  } catch (err: unknown) {
    handles.system(`History navigation error: ${errMsg(err)}`);
  }
}
