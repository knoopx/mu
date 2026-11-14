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
