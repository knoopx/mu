import { useMemo } from "react";
import {
  mergeUserMessages,
  useUserMessageHistory,
  userMessagesFromTranscript,
  type UserMessage,
} from "../lib/composer/userMessageHistory";
import type { TranscriptItem } from "../lib/agent/transcriptState";

export interface UserMessagesState {
  messages: readonly UserMessage[];
  loading: boolean;
  error: string | null;

  reload(): void;
}

export function useUserMessages(
  cwd: string,
  active: boolean,
  items: readonly TranscriptItem[],
  sessionName: string,
): UserMessagesState {
  const folder = useUserMessageHistory(cwd, active);
  const messages = useMemo<readonly UserMessage[]>(
    () =>
      mergeUserMessages([
        folder.messages,
        userMessagesFromTranscript(items, sessionName),
      ]),
    [folder.messages, items, sessionName],
  );
  return {
    messages,
    loading: folder.loading,
    error: folder.error,
    reload: folder.reload,
  };
}
