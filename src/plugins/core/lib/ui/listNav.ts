import { useEffect, useState } from "react";
import type { EventPayload } from "@gpuix/native";

export interface ListNavOptions {
  count: number;

  pageSize?: number;

  resetOn?: unknown;

  onMove?: (index: number) => void;

  onEnter?: (index: number) => void;

  onSpace?: (index: number) => void;

  onEscape?: () => void;
}

export interface ListKeyHandlers {
  onUp?: () => void;

  onDown?: () => void;

  onPageUp?: () => void;

  onPageDown?: () => void;

  onEnter?: () => void;

  onSpace?: () => void;

  onEscape?: () => void;
}

const LIST_KEY_ACTIONS: Record<string, keyof ListKeyHandlers> = {
  up: "onUp",
  arrowup: "onUp",
  down: "onDown",
  arrowdown: "onDown",
  pgup: "onPageUp",
  pageup: "onPageUp",
  page_up: "onPageUp",
  pgdown: "onPageDown",
  pagedown: "onPageDown",
  page_down: "onPageDown",
  enter: "onEnter",
  " ": "onSpace",
  escape: "onEscape",
};

export function handleListKey(
  event: EventPayload,
  handlers: ListKeyHandlers,
): void {
  const action = LIST_KEY_ACTIONS[(event.key ?? "").toLowerCase()];
  if (!action) return;
  handlers[action]?.();
}

export interface ListNav {
  selectedIndex: number;

  setSelectedIndex: (index: number) => void;

  clampedIndex: number;

  move: (delta: number) => number;

  pageJump: (delta: number) => void;

  select: (index: number) => void;

  onKeyDown: (event: EventPayload) => void;
}

export function useListNav(options: ListNavOptions): ListNav {
  const { count, pageSize, resetOn, onMove, onEnter, onSpace, onEscape } =
    options;
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [resetOn]);

  const clampedIndex = count === 0 ? 0 : Math.min(selectedIndex, count - 1);

  const move = (delta: number): number => {
    if (count === 0) return clampedIndex;
    const next = Math.max(0, Math.min(count - 1, clampedIndex + delta));
    if (next !== clampedIndex) setSelectedIndex(next);
    onMove?.(next);
    return next;
  };

  const pageJump = (delta: number): void => {
    if (count === 0 || pageSize === undefined) return;
    const page = Math.floor(clampedIndex / pageSize);
    const pageCount = Math.max(1, Math.ceil(count / pageSize));
    const targetPage = Math.max(0, Math.min(pageCount - 1, page + delta));
    setSelectedIndex(Math.min(targetPage * pageSize, count - 1));
  };

  const select = (index: number): void => {
    setSelectedIndex(Math.max(0, Math.min(count - 1, index)));
  };

  const onKeyDown = (event: EventPayload): void => {
    handleListKey(event, {
      onUp: () => move(-1),
      onDown: () => move(1),
      onPageUp: () => pageJump(-1),
      onPageDown: () => pageJump(1),
      onEnter: () => onEnter?.(clampedIndex),
      onSpace: () => onSpace?.(clampedIndex),
      onEscape,
    });
  };

  return {
    selectedIndex,
    setSelectedIndex,
    clampedIndex,
    move,
    pageJump,
    select,
    onKeyDown,
  };
}
