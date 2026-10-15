import { useCallback, useState } from "react";
import { draftMode, type ComposerMode } from "../lib/composer/mode";
import type { ComposerAttachment } from "../components/composer/attachments";

export interface ComposerStateOptions {
  initialInput?: string;

  initialAttachments?: ComposerAttachment[];

  initialMode?: ComposerMode;
}

export interface ComposerState {
  input: string;

  setInput(value: string | ((prev: string) => string)): void;

  attachments: ComposerAttachment[];

  setAttachments(
    value: ComposerAttachment[] | ((prev: ComposerAttachment[]) => ComposerAttachment[]),
  ): void;

  mode: ComposerMode;

  setMode(mode: ComposerMode): void;

  followTail: boolean;

  setFollowTail(follow: boolean): void;

  clearComposer(): void;

  clearAttachments(): void;

  removeAttachment(id: string): void;

  appendPath(text: string): void;
}

const appendTo = (prev: string, text: string): string =>
  `${prev}${prev.length > 0 && !prev.endsWith(" ") ? " " : ""}${text} `;

export function useComposerState(opts: ComposerStateOptions = {}): ComposerState {
  const [input, setInput] = useState(opts.initialInput ?? "");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>(
    opts.initialAttachments ?? [],
  );
  const [followTail, setFollowTail] = useState(true);
  const [mode, setMode] = useState<ComposerMode>(
    opts.initialMode ?? draftMode(),
  );

  const clearComposer = useCallback((): void => {
    setInput("");
    setAttachments([]);
  }, []);

  const clearAttachments = useCallback((): void => {
    setAttachments([]);
  }, []);

  const removeAttachment = useCallback((id: string): void => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const appendPath = useCallback((text: string): void => {
    setInput((prev) => appendTo(prev, text));
  }, []);

  return {
    input,
    setInput,
    attachments,
    setAttachments,
    mode,
    setMode,
    followTail,
    setFollowTail,
    clearComposer,
    clearAttachments,
    removeAttachment,
    appendPath,
  };
}
